import { createContext, useContext } from "react";
import type { HomeCheck } from "../core";

const HomeCheckContext = createContext<HomeCheck | null>(null);

export const HomeCheckProvider = HomeCheckContext.Provider;

export function useHomeCheck(): HomeCheck {
  const homeCheck = useContext(HomeCheckContext);
  if (!homeCheck) throw new Error("useHomeCheck must be used inside HomeCheckProvider");
  return homeCheck;
}
