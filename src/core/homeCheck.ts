import { formatAddress, matchingAddresses, validateAddress } from "./address";
import { buildExportZip, exportFileName } from "./export";
import { newId } from "./ids";
import type {
  AiConfidence,
  AiConfirmInput,
  AiCorrectionInput,
  AiQueueEntry,
  AiSuggestion,
  AiSuggestionView,
  AiWorkLeft,
  Area,
  AreaSource,
  AreaView,
  Defect,
  DefectChanges,
  DefectChoices,
  DefectInput,
  DefectView,
  Inspection,
  InspectionSummary,
  InspectionTotals,
  InspectionType,
  Item,
  ItemChoices,
  ItemSource,
  ItemView,
  MediaEvidence,
  MoveInRecord,
  MoveOutSource,
  NoteEvidence,
  MediaVersion,
  PhotoEvidence,
  StorageDurability,
  UnitAddress,
  UnitAddressInput,
  UnreviewedAiSuggestionView,
  VideoEvidence,
  Severity,
} from "./model";
import { AI_CONFIDENCES, isMedia, MAX_AI_SUGGESTIONS_PER_PHOTO, SEVERITIES, VIDEO_TIME_LIMIT_SECONDS } from "./model";
import type { AiAnswer, AiClient, Environment, ImageProcessor, Storage } from "./ports";
import {
  checkReferenceData,
  defectTypeCodes,
  findCatalogItem,
  findCategory,
  findDefectType,
  findStandardArea,
  type DefectType,
  type ReferenceData,
} from "./referenceData";

export type HomeCheckDeps = {
  storage: Storage;
  environment: Environment;
  referenceData: ReferenceData;
  imageProcessor: ImageProcessor;
  aiClient: AiClient;
};

const inspectorNameRequired = { ok: false, reason: "inspector-name-required" } as const;
const inspectionNotFound = { ok: false, reason: "inspection-not-found" } as const;
/** A Completed Inspection's Areas, Items, Evidence and Defects are locked. */
const inspectionCompleted = { ok: false, reason: "inspection-completed" } as const;
/** An Inspection with no Areas records nothing, so it can't be completed. */
const noAreas = { ok: false, reason: "no-areas" } as const;
const areaNotFound = { ok: false, reason: "area-not-found" } as const;
const itemNotFound = { ok: false, reason: "item-not-found" } as const;
const itemNameRequired = { ok: false, reason: "item-name-required" } as const;
const noteRequired = { ok: false, reason: "note-required" } as const;
/** A new Defect from an AI Suggestion needs a Severity (ADR 0007). */
const severityRequired = { ok: false, reason: "severity-required" } as const;
const unknownSeverity = { ok: false, reason: "unknown-severity" } as const;
const evidenceNotOnItem = { ok: false, reason: "evidence-not-on-item" } as const;
/** A Defect is made by assigning a Defect Type to Evidence, so it always has at least one piece. */
const evidenceRequired = { ok: false, reason: "evidence-required" } as const;
const defectNotFound = { ok: false, reason: "defect-not-found" } as const;
const videoTooLong = { ok: false, reason: "video-too-long" } as const;
/** An empty Evidence note; not to be confused with `note-required`, a Defect that needs a note. */
const blankNote = { ok: false, reason: "blank-note" } as const;
const evidenceNotFound = { ok: false, reason: "evidence-not-found" } as const;
const unknownDefectType = { ok: false, reason: "unknown-defect-type" } as const;
const aiSuggestionNotFound = { ok: false, reason: "ai-suggestion-not-found" } as const;
/** An AI Suggestion's outcome is final once reviewed. */
const aiSuggestionAlreadyReviewed = { ok: false, reason: "ai-suggestion-already-reviewed" } as const;

/** Recording stops itself at the limit, but the stop lands a moment late; up to this much over still counts as the limit. */
const VIDEO_STOP_ALLOWANCE_SECONDS = 1;

export function createHomeCheck({ storage, environment, referenceData, imageProcessor, aiClient }: HomeCheckDeps) {
  checkReferenceData(referenceData);
  const allowedCodes = defectTypeCodes(referenceData);

  /** Smaller versions being made right now, by photo or video, so capture and the AI queue never make them twice at once. */
  const smallerVersionsUnderWay = new Map<string, Promise<MediaEvidence>>();

  /** Adds a photo's Evidence copy and thumbnail, or a video's thumbnail; on failure leaves it unprocessed with its original intact. */
  function makeSmallerVersions<E extends MediaEvidence>(evidence: E, original: Blob): Promise<E> {
    const underWay = smallerVersionsUnderWay.get(evidence.id);
    if (underWay) return underWay as Promise<E>;
    const making = makeSmallerVersionsNow(evidence, original).finally(() => smallerVersionsUnderWay.delete(evidence.id));
    smallerVersionsUnderWay.set(evidence.id, making);
    return making;
  }

  async function makeSmallerVersionsNow<E extends MediaEvidence>(evidence: E, original: Blob): Promise<E> {
    let versions;
    try {
      versions =
        evidence.kind === "photo" ? await imageProcessor.processPhoto(original) : await imageProcessor.processVideo(original);
    } catch {
      return evidence;
    }
    const processed = { ...evidence, processed: true };
    await storage.putEvidence(processed, versions);
    return processed;
  }

  /** A new Draft, stamped with the Inspector and start time. */
  function newInspection(type: InspectionType, address: UnitAddress, inspectorName: string): Inspection {
    return { id: newId(), type, status: "draft", address, inspectorName, startedAt: environment.now().toISOString() };
  }

  /** A new Draft at the typed address, once it passes validation. */
  async function startAtAddress(type: InspectionType, input: UnitAddressInput, inspectorName: string) {
    const validation = validateAddress(input);
    if (!validation.ok) return { ok: false as const, reason: "invalid-address" as const, errors: validation.errors };
    const inspection = newInspection(type, validation.address, inspectorName);
    await storage.putInspection(inspection);
    return { ok: true as const, inspection };
  }

  /**
   * Deletes an Item's Defects, then its Evidence with media, AI queue entries and AI Suggestions, then the
   * Item: the record last, so an interrupted delete can simply be tried again. Says whether photos went.
   */
  async function deleteItemAndContents(itemId: string): Promise<boolean> {
    for (const defect of await storage.listDefects(itemId)) await storage.deleteDefect(defect.id);
    const evidence = await storage.listEvidence(itemId);
    for (const each of evidence) await storage.deleteEvidence(each.id);
    await storage.deleteItem(itemId);
    return evidence.some((each) => each.kind === "photo");
  }

  /** Whether the Inspection is Completed, so its Areas, Items, Evidence and Defects can't change. */
  async function isLocked(inspectionId: string): Promise<boolean> {
    return (await storage.getInspection(inspectionId))?.status === "completed";
  }

  async function withDefectCount(item: Item): Promise<ItemView> {
    return toItemView(item, (await storage.listDefects(item.id)).length);
  }

  /** A code missing from the bundled Dictionary (recorded under an older version) shows as itself. */
  function toDefectView(defect: Defect): DefectView {
    const dictionaryEntry = findDefectType(referenceData, defect.defectTypeCode);
    return {
      ...defect,
      defectTypeName: dictionaryEntry?.defectType.name ?? defect.defectTypeCode,
      categoryName: dictionaryEntry?.category.name ?? "Not in the bundled Defect Dictionary",
      noteRequired: needsNote(defect.defectTypeCode),
    };
  }

  /** Other / Unknown and any other Category marked `noteRequired` can't be recorded without a note. */
  function needsNote(defectTypeCode: string): boolean {
    return !!findDefectType(referenceData, defectTypeCode)?.category.noteRequired;
  }

  /** The fields every new piece of Evidence of `item` starts with. */
  async function newEvidence(item: Item) {
    return {
      id: newId(),
      inspectionId: item.inspectionId,
      itemId: item.id,
      capturedAt: environment.now().toISOString(),
      position: nextPosition(await storage.listEvidence(item.id)),
    };
  }

  /** The Evidence ids without repeats, or null if any isn't Evidence of this Item. */
  async function evidenceOfItem(itemId: string, evidenceIds: string[]): Promise<string[] | null> {
    const ofItem = new Set((await storage.listEvidence(itemId)).map((evidence) => evidence.id));
    const unique = [...new Set(evidenceIds)];
    return unique.every((id) => ofItem.has(id)) ? unique : null;
  }

  const aiChangeListeners = new Set<() => void>();
  function aiChanged() {
    aiChangeListeners.forEach((listener) => listener());
  }

  /** Set while the queue runs by itself: on app open, on coming online and after each capture. */
  let aiQueueStarted = false;
  let aiQueueRun: Promise<void> | null = null;
  let aiQueueRunAgain = false;

  /** One run at a time, so photos go one at a time; a trigger during a run makes it go round again. */
  function processAiQueue(): Promise<void> {
    if (aiQueueRun) {
      aiQueueRunAgain = true;
      return aiQueueRun;
    }
    aiQueueRun = (async () => {
      try {
        do {
          aiQueueRunAgain = false;
          for (const entry of await storage.listAiQueue()) {
            if (!environment.isOnline()) return;
            await sendToAi(entry);
          }
        } while (aiQueueRunAgain);
      } finally {
        aiQueueRun = null;
      }
    })();
    return aiQueueRun;
  }

  function toAiSuggestionView(suggestion: AiSuggestion): AiSuggestionView {
    const dictionaryEntry = findDefectType(referenceData, suggestion.defectTypeCode);
    const { correctedCode } = suggestion;
    return {
      ...suggestion,
      defectTypeName: dictionaryEntry?.defectType.name ?? suggestion.defectTypeCode,
      categoryName: dictionaryEntry?.category.name ?? "Not in the bundled Defect Dictionary",
      noteRequired: needsNote(suggestion.defectTypeCode),
      ...(correctedCode && {
        correctedDefectTypeName: findDefectType(referenceData, correctedCode)?.defectType.name ?? correctedCode,
      }),
    };
  }

  /** The AI Suggestion, if it's still waiting for the Inspector's review. */
  async function findUnreviewed(suggestionId: string) {
    const suggestion = await storage.getAiSuggestion(suggestionId);
    if (!suggestion) return aiSuggestionNotFound;
    if (suggestion.outcome !== "unreviewed") return aiSuggestionAlreadyReviewed;
    return { ok: true as const, suggestion };
  }

  /**
   * Records `defectTypeCode` on the suggestion's Item with its photo as Evidence: a new AI-suggested Defect,
   * or the photo added to the Defect of that type the Item already has. `note` and `severity` are only for a new Defect,
   * which needs a Severity.
   * The suggestion counts as confirmed if `defectTypeCode` is its own, and as corrected otherwise.
   * Skips the Completed lock: late AI Suggestions may still add Defects.
   */
  async function acceptAiSuggestion(
    suggestion: AiSuggestion,
    defectTypeCode: string,
    note: string | undefined,
    severity: Severity | undefined,
    withoutSeverity = false,
  ) {
    if (!findDefectType(referenceData, defectTypeCode)) return unknownDefectType;
    const existing = await storage.listDefects(suggestion.itemId);
    const sameType = existing.find((other) => other.defectTypeCode === defectTypeCode);
    const trimmedNote = note?.trim();
    if (!sameType && needsNote(defectTypeCode) && !trimmedNote) return noteRequired;
    if (!sameType && !severity && !withoutSeverity) return severityRequired;
    if (severity && !SEVERITIES.includes(severity)) return unknownSeverity;
    const defect: Defect = sameType
      ? withEvidence(sameType, suggestion.evidenceId)
      : {
          id: newId(),
          inspectionId: suggestion.inspectionId,
          itemId: suggestion.itemId,
          defectTypeCode,
          dictionaryVersion: referenceData.defectDictionary.version,
          source: "ai-suggested",
          aiSuggestionId: suggestion.id,
          ...(trimmedNote && { note: trimmedNote }),
          ...(severity && { severity }),
          evidenceIds: [suggestion.evidenceId],
          position: nextPosition(existing),
        };
    const outcome: Pick<AiSuggestion, "outcome" | "correctedCode"> =
      defectTypeCode === suggestion.defectTypeCode
        ? { outcome: "confirmed" }
        : { outcome: "corrected", correctedCode: defectTypeCode };
    const linked = !sameType?.evidenceIds.includes(suggestion.evidenceId) && { linkedDefectId: defect.id };
    await storage.saveAiReview({ ...suggestion, ...outcome, ...linked, reviewedAt: environment.now().toISOString() }, defect);
    aiChanged();
    return { ok: true as const, defect: toDefectView(defect), addedToExisting: !!sameType };
  }

  async function listAiSuggestions(itemId: string): Promise<AiSuggestionView[]> {
    const suggestions = await storage.listAiSuggestions(itemId);
    const photoOrder = new Map((await storage.listEvidence(itemId)).map((evidence) => [evidence.id, evidence.position]));
    return suggestions
      .sort((a, b) => (photoOrder.get(a.evidenceId) ?? 0) - (photoOrder.get(b.evidenceId) ?? 0) || a.rank - b.rank)
      .map(toAiSuggestionView);
  }

  async function listUnreviewedAiSuggestions(inspectionId: string): Promise<UnreviewedAiSuggestionView[]> {
    const unreviewed: UnreviewedAiSuggestionView[] = [];
    for (const area of await storage.listAreas(inspectionId)) {
      for (const item of await storage.listItems(area.id)) {
        for (const suggestion of await listAiSuggestions(item.id)) {
          if (suggestion.outcome !== "unreviewed") continue;
          unreviewed.push({ ...suggestion, areaName: area.name, itemName: itemDisplayName(item) });
        }
      }
    }
    return unreviewed;
  }

  /** Sends one queued photo to the AI. A failure leaves it queued with one more attempt counted. */
  async function sendToAi(entry: AiQueueEntry): Promise<void> {
    let photo = await storage.getEvidence(entry.evidenceId);
    if (photo?.kind !== "photo") {
      // Nothing to send; clear the entry so it isn't counted as waiting.
      await storage.finishAiRequest(entry.evidenceId, []);
      return;
    }
    if (!photo.processed) {
      // Never send the full-size original: make the Evidence copy first, or wait for the next trigger.
      const original = await storage.getMedia(photo.id, "original");
      if (original) photo = await makeSmallerVersions(photo, original);
      if (!photo.processed) return;
    }
    const item = await storage.getItem(photo.itemId);
    const area = item && (await storage.getArea(item.areaId));
    const evidenceCopy = await storage.getMedia(photo.id, "evidenceCopy");
    if (!area || !evidenceCopy) return;
    const relevant = (item.catalogItemId && findCatalogItem(referenceData, item.catalogItemId)?.relevantCategories) || [];
    let answers: AiAnswer[];
    try {
      answers = await aiClient.suggestDefectTypes({
        evidenceCopy,
        areaName: area.name,
        itemName: itemDisplayName(item),
        // checkReferenceData guarantees every relevant Category is in the Dictionary.
        relevantCategories: relevant.map((code) => ({ code, name: findCategory(referenceData, code)!.name })),
        allowedCodes,
      });
    } catch {
      await storage.recordFailedAiAttempt(entry.evidenceId, environment.now().toISOString());
      return;
    }
    const suggestedAt = environment.now().toISOString();
    const { id: evidenceId, inspectionId, itemId } = photo;
    const suggestions: AiSuggestion[] = validAnswers(answers).map((answer, index) => ({
      id: newId(),
      inspectionId,
      itemId,
      evidenceId,
      defectTypeCode: answer.code,
      dictionaryVersion: referenceData.defectDictionary.version,
      confidence: answer.confidence,
      outcome: "unreviewed",
      suggestedAt,
      rank: index + 1,
    }));
    await storage.finishAiRequest(evidenceId, suggestions);
    aiChanged();
  }

  /** Keeps only Dictionary codes with a known confidence, each once, at most three. */
  function validAnswers(answers: AiAnswer[]): ValidAiAnswer[] {
    const valid: ValidAiAnswer[] = [];
    for (const { code, confidence } of answers) {
      if (!allowedCodes.includes(code) || !AI_CONFIDENCES.includes(confidence as AiConfidence)) continue;
      if (valid.some((other) => other.code === code)) continue;
      valid.push({ code, confidence: confidence as AiConfidence });
    }
    return valid.slice(0, MAX_AI_SUGGESTIONS_PER_PHOTO);
  }

  return {
    async getSettings() {
      return storage.getSettings();
    },

    /**
     * Data lives only on this phone (ADR 0004), so asks the browser to keep it, once, on first launch; later launches
     * only look, catching a grant made since (as after installing the app). The result shows in settings.
     */
    async checkStorageDurability(): Promise<StorageDurability> {
      const settings = await storage.getSettings();
      const persisted =
        settings.storageDurability === null
          ? await environment.requestPersistentStorage()
          : await environment.isStoragePersisted();
      const storageDurability: StorageDurability = persisted ? "granted" : "refused";
      // Read again so a name saved while the browser was asking isn't overwritten.
      await storage.saveSettings({ ...(await storage.getSettings()), storageDurability });
      return storageDurability;
    },

    async setInspectorName(name: string) {
      const inspectorName = name.trim();
      if (!inspectorName) return inspectorNameRequired;
      const settings = await storage.getSettings();
      await storage.saveSettings({ ...settings, inspectorName });
      return { ok: true as const, inspectorName };
    },

    async startMoveIn(input: UnitAddressInput) {
      const { inspectorName } = await storage.getSettings();
      if (!inspectorName) return inspectorNameRequired;
      return startAtAddress("move-in", input, inspectorName);
    },

    /**
     * A linked Move-out copies its Move-in's address, Areas and Items, and nothing else: no Evidence, Defects or AI Suggestions.
     * An unlinked Move-out, for a Unit with no Move-in on this phone, starts from a typed address.
     */
    async startMoveOut(source: MoveOutSource) {
      const { inspectorName } = await storage.getSettings();
      if (!inspectorName) return inspectorNameRequired;
      if ("address" in source) return startAtAddress("move-out", source.address, inspectorName);

      const moveIn = await storage.getInspection(source.moveInId);
      if (!moveIn) return inspectionNotFound;
      if (moveIn.type !== "move-in") return { ok: false as const, reason: "not-a-move-in" as const };
      const inspection: Inspection = { ...newInspection("move-out", moveIn.address, inspectorName), linkedMoveInId: moveIn.id };
      const areas: Area[] = [];
      const items: Item[] = [];
      for (const moveInArea of await storage.listAreas(moveIn.id)) {
        const { name, standardAreaId, position } = moveInArea;
        const area: Area = { id: newId(), inspectionId: inspection.id, name, standardAreaId, position };
        areas.push(area);
        for (const { catalogItemId, name, shortName, position } of await storage.listItems(moveInArea.id)) {
          items.push({
            id: newId(),
            inspectionId: inspection.id,
            areaId: area.id,
            catalogItemId,
            name,
            ...(shortName && { shortName }),
            position,
          });
        }
      }
      await storage.putInspectionWithAreasAndItems(inspection, areas, items);
      return { ok: true as const, inspection };
    },

    async getInspection(id: string) {
      return storage.getInspection(id);
    },

    /**
     * Deletes an Inspection from the phone for good, with its Areas, Items, Evidence and Defects; Draft or
     * Completed. A Move-out linked to it keeps its link, which then reads as deleted.
     */
    async deleteInspection(id: string) {
      if (!(await storage.getInspection(id))) return inspectionNotFound;
      let photosDeleted = false;
      for (const area of await storage.listAreas(id)) {
        for (const item of await storage.listItems(area.id)) {
          if (await deleteItemAndContents(item.id)) photosDeleted = true;
        }
        await storage.deleteArea(area.id);
      }
      // The record last, so an interrupted delete still shows and can simply be tried again.
      await storage.deleteInspection(id);
      if (photosDeleted) aiChanged();
      return { ok: true as const };
    },

    /** Draft → Completed is the only transition; a Completed Inspection is never reopened. */
    async completeInspection(id: string) {
      const inspection = await storage.getInspection(id);
      if (!inspection) return inspectionNotFound;
      if (inspection.status === "completed") return inspectionCompleted;
      if ((await storage.listAreas(id)).length === 0) return noAreas;
      const completed: Inspection = { ...inspection, status: "completed", completedAt: environment.now().toISOString() };
      await storage.putInspection(completed);
      return { ok: true as const, inspection: completed };
    },

    /** What completing would lock in, so the Inspector can spot an empty Inspection first. */
    async inspectionTotals(id: string): Promise<InspectionTotals> {
      async function countDefects(itemId: string) {
        const defects = await storage.listDefects(itemId);
        return { defects: defects.length, defectsWithoutSeverity: defects.filter((defect) => !defect.severity).length };
      }
      const areas = await storage.listAreas(id);
      const items = (await Promise.all(areas.map((area) => storage.listItems(area.id)))).flat();
      const perItem = await Promise.all(
        items.map(async (item) => ({
          evidence: (await storage.listEvidence(item.id)).length,
          ...(await countDefects(item.id)),
        })),
      );
      return {
        areas: areas.length,
        items: items.length,
        evidence: perItem.reduce((total, counts) => total + counts.evidence, 0),
        defects: perItem.reduce((total, counts) => total + counts.defects, 0),
        defectsWithoutSeverity: perItem.reduce((total, counts) => total + counts.defectsWithoutSeverity, 0),
      };
    },

    /** The Inspection as a zip of `inspection.xlsx` and its media, Draft or Completed. Records when it was exported. */
    async exportInspection(id: string) {
      const inspection = await storage.getInspection(id);
      if (!inspection) return inspectionNotFound;
      const areas = await Promise.all(
        (await storage.listAreas(id)).map(async (area) => ({
          area,
          items: await Promise.all(
            (await storage.listItems(area.id)).map(async (item) => ({
              item,
              displayName: itemDisplayName(item),
              evidence: await storage.listEvidence(item.id),
              defects: (await storage.listDefects(item.id)).map(toDefectView),
              aiSuggestions: await listAiSuggestions(item.id),
            })),
          ),
        })),
      );
      const zip = await buildExportZip({
        inspection,
        linkedMoveIn: inspection.linkedMoveInId ? await storage.getInspection(inspection.linkedMoveInId) : undefined,
        dictionaryVersion: referenceData.defectDictionary.version,
        areas,
        getMedia: (evidenceId, version) => storage.getMedia(evidenceId, version),
      });
      // Read again so a change made while the zip was built (completing, say) isn't overwritten. Not a change
      // to the record, so a Completed Inspection takes it too.
      const latest = (await storage.getInspection(id)) ?? inspection;
      const exported: Inspection = { ...latest, lastExportedAt: environment.now().toISOString() };
      await storage.putInspection(exported);
      return { ok: true as const, zip, fileName: exportFileName(exported), inspection: exported };
    },

    async listInspections(): Promise<InspectionSummary[]> {
      return summarise(await storage.listInspections());
    },

    /** The Move-ins on this phone a Move-out can link to, Draft or Completed, newest first. */
    async listMoveIns(): Promise<InspectionSummary[]> {
      return summarise((await storage.listInspections()).filter((inspection) => inspection.type === "move-in"));
    },

    /** Addresses entered in earlier Inspections on this phone that match what's typed, so the same Unit keeps one spelling. */
    async suggestAddresses(typed: string): Promise<UnitAddress[]> {
      return matchingAddresses(newestFirst(await storage.listInspections()).map((inspection) => inspection.address), typed);
    },

    async listStandardAreas() {
      return referenceData.standardAreas.areas.map(({ id, name }) => ({ id, name }));
    },

    /** The name a standard Area would get now: "Bedroom", or "Bedroom 2" if the Inspection already has one. */
    async defaultAreaName(inspectionId: string, standardAreaId: string) {
      const standardArea = findStandardArea(referenceData, standardAreaId);
      if (!standardArea) return { ok: false as const, reason: "unknown-standard-area" as const };
      const taken = (await storage.listAreas(inspectionId)).map((other) => other.name);
      return { ok: true as const, name: firstFreeName(standardArea.name, taken) };
    },

    async addArea(inspectionId: string, source: AreaSource) {
      const inspection = await storage.getInspection(inspectionId);
      if (!inspection) return inspectionNotFound;
      if (inspection.status === "completed") return inspectionCompleted;
      const existing = await storage.listAreas(inspectionId);
      const takenNames = existing.map((other) => other.name);

      let name: string;
      let standardAreaId: string | null = null;
      if ("standardAreaId" in source) {
        const standardArea = findStandardArea(referenceData, source.standardAreaId);
        if (!standardArea) return { ok: false as const, reason: "unknown-standard-area" as const };
        standardAreaId = standardArea.id;
        const chosen = source.name?.trim();
        if (chosen) {
          const problem = areaNameProblem(chosen, takenNames);
          if (problem) return { ok: false as const, reason: problem };
          name = chosen;
        } else {
          name = firstFreeName(standardArea.name, takenNames);
        }
      } else {
        name = source.customName.trim();
        const problem = areaNameProblem(name, takenNames);
        if (problem) return { ok: false as const, reason: problem };
      }

      const area: Area = {
        id: newId(),
        inspectionId,
        name,
        standardAreaId,
        position: nextPosition(existing),
      };
      await storage.putArea(area);
      return { ok: true as const, area };
    },

    async renameArea(areaId: string, newName: string) {
      const area = await storage.getArea(areaId);
      if (!area) return areaNotFound;
      if (await isLocked(area.inspectionId)) return inspectionCompleted;
      const name = newName.trim();
      const others = (await storage.listAreas(area.inspectionId)).filter((other) => other.id !== areaId);
      const problem = areaNameProblem(name, others.map((other) => other.name));
      if (problem) return { ok: false as const, reason: problem };
      const renamed = { ...area, name };
      await storage.putArea(renamed);
      return { ok: true as const, area: renamed };
    },

    async removeArea(areaId: string) {
      const area = await storage.getArea(areaId);
      if (!area) return areaNotFound;
      if (await isLocked(area.inspectionId)) return inspectionCompleted;
      if ((await storage.listItems(areaId)).length > 0) return { ok: false as const, reason: "area-has-items" as const };
      await storage.deleteArea(areaId);
      return { ok: true as const };
    },

    async getArea(areaId: string) {
      return storage.getArea(areaId);
    },

    async listAreas(inspectionId: string): Promise<AreaView[]> {
      const areas = await storage.listAreas(inspectionId);
      return Promise.all(areas.map(async (area) => ({ ...area, itemCount: (await storage.listItems(area.id)).length })));
    },

    async addItem(areaId: string, source: ItemSource) {
      const area = await storage.getArea(areaId);
      if (!area) return areaNotFound;
      if (await isLocked(area.inspectionId)) return inspectionCompleted;

      let itemIdentity: Pick<Item, "catalogItemId" | "name" | "shortName">;
      if ("catalogItemId" in source) {
        const catalogItem = findCatalogItem(referenceData, source.catalogItemId);
        if (!catalogItem) return { ok: false as const, reason: "unknown-catalog-item" as const };
        const shortName = source.shortName?.trim();
        itemIdentity = { catalogItemId: catalogItem.id, name: catalogItem.name, ...(shortName && { shortName }) };
      } else {
        const name = source.otherName.trim();
        if (!name) return itemNameRequired;
        itemIdentity = { catalogItemId: null, name };
      }

      const existing = await storage.listItems(areaId);
      const item: Item = {
        id: newId(),
        inspectionId: area.inspectionId,
        areaId,
        ...itemIdentity,
        position: nextPosition(existing),
      };
      await storage.putItem(item);
      return { ok: true as const, item: toItemView(item, 0) };
    },

    /** Sets a catalog Item's short name (blank clears it), or an Other item's free-text name. */
    async renameItem(itemId: string, newName: string) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      if (await isLocked(item.inspectionId)) return inspectionCompleted;
      const trimmed = newName.trim();
      let renamed: Item;
      if (item.catalogItemId) {
        const { shortName: _old, ...rest } = item;
        renamed = trimmed ? { ...rest, shortName: trimmed } : rest;
      } else {
        if (!trimmed) return itemNameRequired;
        renamed = { ...item, name: trimmed };
      }
      await storage.putItem(renamed);
      return { ok: true as const, item: await withDefectCount(renamed) };
    },

    /**
     * Takes an Item out of its Area. An Item with Evidence or Defects is refused, unless `withContents`:
     * then its Defects, its Evidence with all media, AI queue entries and AI Suggestions go too, for good.
     */
    async removeItem(itemId: string, { withContents = false }: { withContents?: boolean } = {}) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      if (await isLocked(item.inspectionId)) return inspectionCompleted;
      if (!withContents && (await storage.listDefects(itemId)).length > 0) {
        return { ok: false as const, reason: "item-has-defects" as const };
      }
      if (!withContents && (await storage.listEvidence(itemId)).length > 0) {
        return { ok: false as const, reason: "item-has-evidence" as const };
      }
      if (await deleteItemAndContents(itemId)) aiChanged();
      return { ok: true as const };
    },

    async itemChoices(areaId: string) {
      const area = await storage.getArea(areaId);
      if (!area) return areaNotFound;
      const shownFirstIds = findStandardArea(referenceData, area.standardAreaId)?.itemsShownFirst ?? [];
      // checkReferenceData guarantees every shown-first id is in the catalog.
      const choices: ItemChoices = {
        shownFirst: shownFirstIds.map((id) => findCatalogItem(referenceData, id)!),
        others: referenceData.itemCatalog.items.filter((item) => !shownFirstIds.includes(item.id)),
      };
      return { ok: true as const, ...choices };
    },

    async getItem(itemId: string): Promise<ItemView | undefined> {
      const item = await storage.getItem(itemId);
      return item && withDefectCount(item);
    },

    async listItems(areaId: string): Promise<ItemView[]> {
      return Promise.all((await storage.listItems(areaId)).map(withDefectCount));
    },

    /** Saves the original before making the smaller versions, so a capture is never lost. */
    async addPhoto(itemId: string, original: Blob) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      if (await isLocked(item.inspectionId)) return inspectionCompleted;
      const evidence: PhotoEvidence = { ...(await newEvidence(item)), kind: "photo", processed: false };
      const queued: AiQueueEntry = {
        evidenceId: evidence.id,
        inspectionId: evidence.inspectionId,
        queuedAt: evidence.capturedAt,
        attempts: 0,
      };
      await storage.putEvidence(evidence, { original }, queued);
      aiChanged();
      const photo = await makeSmallerVersions(evidence, original);
      if (aiQueueStarted) void processAiQueue();
      return { ok: true as const, evidence: photo };
    },

    /** Keeps the original exactly as recorded (never compressed), saved before its thumbnail is made. */
    async addVideo(itemId: string, original: Blob, durationSeconds: number) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      if (await isLocked(item.inspectionId)) return inspectionCompleted;
      // Written so that a missing or NaN length is refused too.
      if (!(durationSeconds <= VIDEO_TIME_LIMIT_SECONDS + VIDEO_STOP_ALLOWANCE_SECONDS)) return videoTooLong;
      const evidence: VideoEvidence = {
        ...(await newEvidence(item)),
        kind: "video",
        durationSeconds: Math.min(VIDEO_TIME_LIMIT_SECONDS, Math.round(durationSeconds * 10) / 10),
        processed: false,
      };
      await storage.putEvidence(evidence, { original });
      return { ok: true as const, evidence: await makeSmallerVersions(evidence, original) };
    },

    async addNote(itemId: string, text: string) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      if (await isLocked(item.inspectionId)) return inspectionCompleted;
      const trimmed = text.trim();
      if (!trimmed) return blankNote;
      const evidence: NoteEvidence = { ...(await newEvidence(item)), kind: "note", text: trimmed };
      await storage.putEvidence(evidence, {});
      return { ok: true as const, evidence };
    },

    async editNote(evidenceId: string, text: string) {
      const evidence = await storage.getEvidence(evidenceId);
      if (!evidence) return evidenceNotFound;
      if (await isLocked(evidence.inspectionId)) return inspectionCompleted;
      if (evidence.kind !== "note") return { ok: false as const, reason: "evidence-not-a-note" as const };
      const trimmed = text.trim();
      if (!trimmed) return blankNote;
      const edited: NoteEvidence = { ...evidence, text: trimmed };
      await storage.putEvidence(edited, {});
      return { ok: true as const, evidence: edited };
    },

    /** Retries photos and videos whose smaller versions couldn't be made at capture. Returns how many now have them. */
    async finishMediaProcessing() {
      let finished = 0;
      for (const evidence of await storage.listUnprocessedEvidence()) {
        const original = await storage.getMedia(evidence.id, "original");
        if (original && (await makeSmallerVersions(evidence, original)).processed) finished++;
      }
      return finished;
    },

    async listEvidence(itemId: string) {
      return storage.listEvidence(itemId);
    },

    /**
     * Unlinks the Evidence from its Item's Defects first. A Defect left with no Evidence goes too, since a Defect
     * always has proof. The app asks for confirmation first, naming those Defects.
     */
    async deleteEvidence(evidenceId: string) {
      const evidence = await storage.getEvidence(evidenceId);
      if (!evidence) return evidenceNotFound;
      if (await isLocked(evidence.inspectionId)) return inspectionCompleted;
      for (const defect of await storage.listDefects(evidence.itemId)) {
        if (!defect.evidenceIds.includes(evidenceId)) continue;
        const remaining = defect.evidenceIds.filter((id) => id !== evidenceId);
        if (remaining.length === 0) await storage.deleteDefect(defect.id);
        else await storage.putDefect({ ...defect, evidenceIds: remaining });
      }
      await storage.deleteEvidence(evidenceId);
      if (evidence.kind === "photo") aiChanged();
      return { ok: true as const };
    },

    /** An unprocessed photo has no Evidence copy, and shows its original as its thumbnail. A video never has an Evidence copy. */
    async getMedia(evidenceId: string, version: MediaVersion) {
      const blob = await storage.getMedia(evidenceId, version);
      if (blob || version !== "thumbnail") return blob;
      if ((await storage.getEvidence(evidenceId))?.kind !== "photo") return undefined;
      return storage.getMedia(evidenceId, "original");
    },

    async defectChoices(itemId: string) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      const catalogItem = item.catalogItemId ? findCatalogItem(referenceData, item.catalogItemId) : undefined;
      const relevant = catalogItem?.relevantCategories ?? [];
      // Within each Category, the Item's own Defect Types first: Basin Cracked before Toilet Bowl Loose for a Basin.
      const categories = referenceData.defectDictionary.categories.map((category) =>
        catalogItem ? { ...category, defectTypes: namedAfterFirst(category.defectTypes, catalogItem.name) } : category,
      );
      // checkReferenceData guarantees every relevant Category is in the Dictionary.
      const choices: DefectChoices = {
        shownFirst: relevant.map((code) => categories.find((category) => category.code === code)!),
        others: categories.filter((category) => !relevant.includes(category.code)),
      };
      return { ok: true as const, ...choices };
    },

    async addDefect(itemId: string, input: DefectInput) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      if (await isLocked(item.inspectionId)) return inspectionCompleted;
      if (!findDefectType(referenceData, input.defectTypeCode)) return unknownDefectType;
      const existing = await storage.listDefects(itemId);
      const sameType = existing.find((other) => other.defectTypeCode === input.defectTypeCode);
      if (sameType) {
        return { ok: false as const, reason: "defect-type-already-recorded" as const, existingDefectId: sameType.id };
      }
      const evidenceIds = await evidenceOfItem(itemId, input.evidenceIds ?? []);
      if (!evidenceIds) return evidenceNotOnItem;
      if (evidenceIds.length === 0) return evidenceRequired;
      const note = input.note?.trim();
      if (needsNote(input.defectTypeCode) && !note) return noteRequired;
      // Optional here: the guided flow makes the Defect first and asks for its Severity next, so nothing captured is lost.
      if (input.severity && !SEVERITIES.includes(input.severity)) return unknownSeverity;
      const defect: Defect = {
        id: newId(),
        inspectionId: item.inspectionId,
        itemId,
        defectTypeCode: input.defectTypeCode,
        dictionaryVersion: referenceData.defectDictionary.version,
        source: "manual",
        ...(note && { note }),
        ...(input.severity && { severity: input.severity }),
        evidenceIds,
        position: nextPosition(existing),
      };
      await storage.putDefect(defect);
      return { ok: true as const, defect: toDefectView(defect) };
    },

    async editDefect(defectId: string, changes: DefectChanges) {
      const defect = await storage.getDefect(defectId);
      if (!defect) return defectNotFound;
      if (await isLocked(defect.inspectionId)) return inspectionCompleted;
      let evidenceIds = defect.evidenceIds;
      if (changes.evidenceIds) {
        const checked = await evidenceOfItem(defect.itemId, changes.evidenceIds);
        if (!checked) return evidenceNotOnItem;
        if (checked.length === 0) return evidenceRequired;
        evidenceIds = checked;
      }
      const { note: oldNote, ...rest } = defect;
      const note = changes.note === undefined ? oldNote : changes.note.trim();
      if (needsNote(defect.defectTypeCode) && !note) return noteRequired;
      if (changes.severity && !SEVERITIES.includes(changes.severity)) return unknownSeverity;
      const edited: Defect = { ...rest, ...(note && { note }), evidenceIds, severity: changes.severity ?? defect.severity };
      await storage.putDefect(edited);
      return { ok: true as const, defect: toDefectView(edited) };
    },

    async removeDefect(defectId: string) {
      const defect = await storage.getDefect(defectId);
      if (!defect) return defectNotFound;
      if (await isLocked(defect.inspectionId)) return inspectionCompleted;
      await storage.deleteDefect(defectId);
      return { ok: true as const };
    },

    async getDefect(defectId: string): Promise<DefectView | undefined> {
      const defect = await storage.getDefect(defectId);
      return defect && toDefectView(defect);
    },

    async listDefects(itemId: string): Promise<DefectView[]> {
      return (await storage.listDefects(itemId)).map(toDefectView);
    },

    /**
     * What the linked Move-in recorded on the same Item, for reference on a Move-out: the Item with the same Item name
     * and short name, in the Area with the same name. Missing when nothing matches, the Move-in is deleted, or the Item
     * isn't on a linked Move-out. Nothing is copied.
     */
    async moveInRecord(itemId: string): Promise<MoveInRecord | undefined> {
      const item = await storage.getItem(itemId);
      const area = item && (await storage.getArea(item.areaId));
      const inspection = item && (await storage.getInspection(item.inspectionId));
      if (!item || !area || !inspection?.linkedMoveInId) return undefined;
      const moveInArea = (await storage.listAreas(inspection.linkedMoveInId)).find((other) => other.name === area.name);
      if (!moveInArea) return undefined;
      const moveInItem = (await storage.listItems(moveInArea.id)).find(
        (other) => other.name === item.name && (other.shortName ?? "") === (item.shortName ?? ""),
      );
      if (!moveInItem) return undefined;
      return {
        defects: (await storage.listDefects(moveInItem.id)).map(toDefectView),
        media: (await storage.listEvidence(moveInItem.id)).filter(isMedia),
      };
    },

    /** Sends queued photos to the AI one at a time, while online. Works on Completed Inspections too. */
    processAiQueue,

    /** Processes the AI queue now, then whenever the phone comes online and after each photo is taken. Returns a stop function. */
    startAiQueue() {
      aiQueueStarted = true;
      void processAiQueue();
      const unsubscribe = environment.onOnlineChange((online) => {
        if (online) void processAiQueue();
      });
      return () => {
        aiQueueStarted = false;
        unsubscribe();
      };
    },

    /** Whether the phone is online now: AI Suggestions only arrive while it is. */
    isOnline(): boolean {
      return environment.isOnline();
    },

    /** Calls `listener` with the new state when the phone goes online or offline; returns an unsubscribe function. */
    onOnlineChange(listener: (online: boolean) => void): () => void {
      const unsubscribe = environment.onOnlineChange(listener);
      return () => {
        unsubscribe();
      };
    },

    /** Calls `listener` when a photo joins or leaves the AI queue, or AI Suggestions arrive or are reviewed; returns an unsubscribe function. */
    onAiChange(listener: () => void) {
      aiChangeListeners.add(listener);
      return () => {
        aiChangeListeners.delete(listener);
      };
    },

    /** Photos across every Inspection still waiting for AI, oldest first, with their failed attempts. */
    async listWaitingForAi() {
      return storage.listAiQueue();
    },

    async countWaitingForAi() {
      return (await storage.listAiQueue()).length;
    },

    /** The Item's AI Suggestions, photo by photo in capture order, each photo's in the AI's ranking. */
    listAiSuggestions,

    /** The Inspection's AI Suggestions not yet confirmed, corrected or rejected, Area by Area and Item by Item. */
    listUnreviewedAiSuggestions,

    /** What the Inspector is told before completing: AI work on this Inspection still to come or to review. */
    async aiWorkLeft(inspectionId: string): Promise<AiWorkLeft> {
      const queue = await storage.listAiQueue();
      return {
        waitingForAi: queue.filter((entry) => entry.inspectionId === inspectionId).length,
        unreviewedAiSuggestions: (await listUnreviewedAiSuggestions(inspectionId)).length,
      };
    },

    /** Makes the AI Suggestion a Defect on its Item, with its photo as Evidence. A new Other / Unknown Defect needs a note. */
    async confirmAiSuggestion(suggestionId: string, confirmation: AiConfirmInput = {}) {
      const found = await findUnreviewed(suggestionId);
      if (!found.ok) return found;
      return acceptAiSuggestion(found.suggestion, found.suggestion.defectTypeCode, confirmation.note, confirmation.severity, confirmation.withoutSeverity);
    },

    /** Records the Defect Type the Inspector chose in place of the AI's, with the photo as Evidence. Choosing the AI's own counts as confirming. */
    async correctAiSuggestion(suggestionId: string, correction: AiCorrectionInput) {
      const found = await findUnreviewed(suggestionId);
      if (!found.ok) return found;
      return acceptAiSuggestion(found.suggestion, correction.defectTypeCode, correction.note, correction.severity, correction.withoutSeverity);
    },

    /** Records that the AI Suggestion is wrong; no Defect is made. */
    async rejectAiSuggestion(suggestionId: string) {
      const found = await findUnreviewed(suggestionId);
      if (!found.ok) return found;
      await storage.saveAiReview({ ...found.suggestion, outcome: "rejected", reviewedAt: environment.now().toISOString() });
      aiChanged();
      return { ok: true as const };
    },

    /**
     * Takes back a confirm, correct or reject: the suggestion is unreviewed again, and its photo comes off the Defect
     * the review linked it to. A Defect the review made, holding only that photo, is removed. Works on a Completed
     * Inspection, as reviewing does.
     */
    async undoAiReview(suggestionId: string) {
      const suggestion = await storage.getAiSuggestion(suggestionId);
      if (!suggestion) return aiSuggestionNotFound;
      if (suggestion.outcome === "unreviewed") return { ok: false as const, reason: "ai-suggestion-not-reviewed" as const };
      const { correctedCode: _corrected, reviewedAt: _reviewed, linkedDefectId, ...rest } = suggestion;
      const unreviewed: AiSuggestion = { ...rest, outcome: "unreviewed" };
      const defect = linkedDefectId ? await storage.getDefect(linkedDefectId) : undefined;
      const others = defect?.evidenceIds.filter((id) => id !== suggestion.evidenceId) ?? [];
      const change =
        defect &&
        (defect.aiSuggestionId === suggestion.id && others.length === 0
          ? { deleteId: defect.id }
          : { put: { ...defect, evidenceIds: others } });
      await storage.undoAiReview(unreviewed, change);
      aiChanged();
      return { ok: true as const };
    },
  };
}

export type HomeCheck = ReturnType<typeof createHomeCheck>;

type OperationResult = { [Op in keyof HomeCheck]: Awaited<ReturnType<HomeCheck[Op]>> }[keyof HomeCheck];

/** Every reason a core operation can refuse. */
export type RefusalReason = Extract<OperationResult, { ok: false }>["reason"];

/** Summaries for the Inspection list and Move-in picker, sorted newest first. */
function summarise(inspections: Inspection[]): InspectionSummary[] {
  return newestFirst(inspections).map(({ id, type, status, startedAt, lastExportedAt, address }) => ({
    id,
    type,
    status,
    addressLine: formatAddress(address),
    address,
    startedAt,
    ...(lastExportedAt && { lastExportedAt }),
  }));
}

function newestFirst(inspections: Inspection[]): Inspection[] {
  return inspections.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function nextPosition(siblings: { position: number }[]): number {
  return Math.max(0, ...siblings.map((sibling) => sibling.position)) + 1;
}

/** An AI answer whose code is in the bundled Dictionary and whose confidence is known. */
type ValidAiAnswer = { code: string; confidence: AiConfidence };

/** The Defect with the Evidence linked too, if it isn't already. */
function withEvidence(defect: Defect, evidenceId: string): Defect {
  return defect.evidenceIds.includes(evidenceId) ? defect : { ...defect, evidenceIds: [...defect.evidenceIds, evidenceId] };
}

function toItemView(item: Item, defectCount: number): ItemView {
  return { ...item, displayName: itemDisplayName(item), defectCount };
}

function itemDisplayName(item: Item): string {
  return item.shortName ? `${item.name} – ${item.shortName}` : item.name;
}

/** `base`, or `base 2`, `base 3`… whichever is first not already taken. */
function firstFreeName(base: string, taken: string[]): string {
  const takenKeys = new Set(taken.map(comparableName));
  if (!takenKeys.has(comparableName(base))) return base;
  let n = 2;
  while (takenKeys.has(comparableName(`${base} ${n}`))) n++;
  return `${base} ${n}`;
}

function areaNameProblem(name: string, taken: string[]) {
  if (!name) return "area-name-required" as const;
  if (taken.some((other) => comparableName(other) === comparableName(name))) return "area-name-taken" as const;
  return null;
}

function comparableName(name: string): string {
  return name.trim().toLowerCase();
}

/** Defect Types whose name starts with the Item's name, as a whole word, then the rest; each group in Dictionary order. */
function namedAfterFirst(defectTypes: DefectType[], itemName: string): DefectType[] {
  const prefix = itemName.toLowerCase();
  const isNamedAfter = (defectType: DefectType) => {
    const name = defectType.name.toLowerCase();
    return name === prefix || name.startsWith(`${prefix} `);
  };
  return [...defectTypes.filter(isNamedAfter), ...defectTypes.filter((defectType) => !isNamedAfter(defectType))];
}
