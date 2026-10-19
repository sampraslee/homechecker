import { useEffect, useState } from "react";
import { useHomeCheck } from "./homeCheckContext";

/**
 * Whether the Inspection is Completed, so its Areas, Items, Evidence and Defects can't be changed.
 * Undefined until known, and if the Inspection isn't found, so no editing controls are offered.
 */
export function useLocked(inspectionId: string | undefined): boolean | undefined {
  const homeCheck = useHomeCheck();
  const [locked, setLocked] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!inspectionId) return;
    homeCheck.getInspection(inspectionId).then((inspection) => setLocked(inspection && inspection.status === "completed"));
  }, [homeCheck, inspectionId]);

  return locked;
}
