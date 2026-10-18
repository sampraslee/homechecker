import type { ReferenceData } from "../core";
import defectDictionary from "./defect-dictionary.json";
import itemCatalog from "./item-catalog.json";
import standardAreas from "./standard-areas.json";

export const bundledReferenceData: ReferenceData = { standardAreas, itemCatalog, defectDictionary };
