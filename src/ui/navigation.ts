import type { Screen } from "./App";

/** The parts of `window.history` navigation uses; `back` and `go` land later, through `pop`. */
export type HistoryLike = {
  readonly state: unknown;
  pushState(state: unknown, unused: string): void;
  replaceState(state: unknown, unused: string): void;
  go(delta: number): void;
};

export type Direction = "forward" | "back";

/** A panel open over a screen; closing it from the app's own buttons. */
export type PanelHandle = { close(): void };

type Entry = { screen: Screen; panel: boolean };
type LivePanel = { index: number; onBack: () => void };
type EntryState = { homeCheckIndex: number };

/** Screens are the same place whatever flags opened them, such as `addingItem`. */
function samePlace(a: Screen, b: Screen): boolean {
  return a.name === b.name && ("id" in a ? a.id : undefined) === ("id" in b ? b.id : undefined);
}

/** Only the place goes into history: coming back to an Area never reopens Add Item. */
function placeOnly(screen: Screen): Screen {
  return screen.name === "area" ? { name: "area", id: screen.id } : screen;
}

function indexOf(state: unknown): number | undefined {
  const index = (state as EntryState | null)?.homeCheckIndex;
  return typeof index === "number" ? index : undefined;
}

/**
 * Keeps the app's screens and open panels in the browser history, so the phone's own back gesture
 * (and Android's back button) goes back a screen or closes a panel instead of leaving the app.
 */
export function createNavigation(history: HistoryLike, show: (screen: Screen, direction: Direction) => void) {
  let entries: Entry[] = [];
  let current = 0;
  /** The screen entry on show, to tell whether landing somewhere changes it. */
  let shown: Entry | undefined;
  const livePanels: LivePanel[] = [];
  /** Backs the app asked for itself and that haven't landed yet. */
  let ownBacks = 0;
  /** Panels opened while one of those backs was still landing; pushed once it has. */
  const waiting: (() => void)[] = [];

  function write(index: number, entry: Entry, replace: boolean) {
    entries = entries.slice(0, index);
    entries[index] = entry;
    current = index;
    const state: EntryState = { homeCheckIndex: index };
    if (replace) history.replaceState(state, "");
    else history.pushState(state, "");
  }

  /** The screen entry under any open panels. */
  function screenIndex(): number {
    let index = current;
    while (index > 0 && entries[index].panel) index--;
    return index;
  }

  function forgetPanelsFrom(index: number): LivePanel[] {
    const closing = livePanels.filter((panel) => panel.index >= index);
    for (const panel of closing) livePanels.splice(livePanels.indexOf(panel), 1);
    return closing;
  }

  function goForward(target: Screen, replace: boolean, direction: Direction) {
    // From a panel, the new screen takes the panel's place, so back skips the closed panel.
    const fromPanel = entries[current]?.panel ?? false;
    if (fromPanel) forgetPanelsFrom(screenIndex() + 1);
    const index = replace || fromPanel ? current : current + 1;
    write(index, { screen: placeOnly(target), panel: false }, replace || fromPanel);
    shown = entries[index];
    show(target, direction);
  }

  return {
    start(initial: Screen) {
      write(0, { screen: initial, panel: false }, true);
      shown = entries[0];
    },

    /** Moves to `target`, deeper in. `replace` leaves no way back to the current screen, as after Start Inspection. */
    go(target: Screen, { replace = false }: { replace?: boolean } = {}) {
      goForward(target, replace, "forward");
    },

    /** Moves up to `parent`: back through history when that's where the Inspector came from. */
    up(parent: Screen) {
      const here = screenIndex();
      if (here > 0 && samePlace(entries[here - 1].screen, parent)) history.go(here - 1 - current);
      else goForward(parent, false, "back");
    },

    /** Gives an opening panel a history entry; the back gesture then calls `onBack`. */
    openPanel(onBack: () => void): PanelHandle {
      const panel: LivePanel = { index: -1, onBack };
      const push = () => {
        panel.index = current + 1;
        livePanels.push(panel);
        write(panel.index, { screen: entries[current].screen, panel: true }, false);
      };
      if (ownBacks > 0) waiting.push(push);
      else push();
      return {
        close() {
          const waitingAt = waiting.indexOf(push);
          if (waitingAt >= 0) return void waiting.splice(waitingAt, 1);
          if (!livePanels.includes(panel)) return;
          forgetPanelsFrom(panel.index);
          // Only the newest entry can be taken back off; an older one is skipped when back lands on it.
          if (panel.index === current) {
            ownBacks++;
            history.go(-1);
          }
        },
      };
    },

    /** Call on every `popstate`. */
    pop(state: unknown) {
      const index = indexOf(state);
      if (ownBacks > 0) {
        ownBacks--;
        if (index !== undefined) current = index;
        if (ownBacks === 0) for (const push of waiting.splice(0)) push();
        return;
      }
      if (index === undefined || !entries[index]) {
        // History from before this visit: start again from the Inspections list.
        entries = [];
        write(0, { screen: { name: "list" }, panel: false }, true);
        shown = entries[0];
        show({ name: "list" }, "back");
        return;
      }
      const from = current;
      current = index;
      for (const panel of forgetPanelsFrom(index + 1)) panel.onBack();
      // A panel entry whose panel has since closed: keep going back.
      if (entries[index].panel && !livePanels.some((panel) => panel.index === index)) {
        history.go(-1);
        return;
      }
      const landing = entries[screenIndex()];
      if (landing !== shown) {
        shown = landing;
        show(landing.screen, index < from ? "back" : "forward");
      }
    },
  };
}

export type Navigation = ReturnType<typeof createNavigation>;
