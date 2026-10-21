import type { HomeCheck, ItemSource, ItemView, RefusalReason } from "../core";

type Ensured = { ok: true; item: ItemView } | { ok: false; reason: RefusalReason };

/**
 * An Item the Inspector has chosen in Record a Defect but that doesn't exist yet: it is created the first time
 * something needs it, which is when its first Evidence is saved. Quitting before then leaves nothing behind.
 */
export function createLazyItem(homeCheck: HomeCheck, areaId: string, source: ItemSource) {
  let created: ItemView | null = null;
  /** A creation under way, so two captures at once make one Item. */
  let creating: Promise<Ensured> | null = null;

  return {
    /** The Item once it exists; `null` until then. */
    created: () => created,

    /** Creates the Item if it doesn't exist yet. A refusal creates nothing, and the next call tries again. */
    ensure(): Promise<Ensured> {
      if (created) return Promise.resolve({ ok: true, item: created });
      creating ??= homeCheck.addItem(areaId, source).then((result) => {
        creating = null;
        if (!result.ok) return { ok: false, reason: result.reason };
        created = result.item;
        return { ok: true, item: result.item };
      });
      return creating;
    },
  };
}
