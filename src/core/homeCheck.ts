import { formatAddress, validateAddress } from "./address";
import type { Inspection, InspectionSummary, UnitAddressInput } from "./model";
import type { Environment, Storage } from "./ports";

export type HomeCheckDeps = {
  storage: Storage;
  environment: Environment;
};

const inspectorNameRequired = { ok: false, reason: "inspector-name-required" } as const;

export function createHomeCheck({ storage, environment }: HomeCheckDeps) {
  return {
    async getSettings() {
      return storage.getSettings();
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
      const validation = validateAddress(input);
      if (!validation.ok) return { ok: false as const, reason: "invalid-address" as const, errors: validation.errors };
      const inspection: Inspection = {
        id: crypto.randomUUID(),
        type: "move-in",
        status: "draft",
        address: validation.address,
        inspectorName,
        startedAt: environment.now().toISOString(),
      };
      await storage.putInspection(inspection);
      return { ok: true as const, inspection };
    },

    async getInspection(id: string) {
      return storage.getInspection(id);
    },

    async listInspections(): Promise<InspectionSummary[]> {
      const inspections = await storage.listInspections();
      return inspections
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .map(({ id, type, status, startedAt, address }) => ({
          id,
          type,
          status,
          addressLine: formatAddress(address),
          startedAt,
        }));
    },
  };
}

export type HomeCheck = ReturnType<typeof createHomeCheck>;
