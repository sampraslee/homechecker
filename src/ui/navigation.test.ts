import { describe, expect, test } from "vitest";
import type { Screen } from "./App";
import { createNavigation, type Direction } from "./navigation";

/** A browser history in which going back lands later, as `popstate` does. */
function fakeHistory() {
  // A browser history always has the page's own entry.
  let stack: unknown[] = [null];
  let index = 0;
  const pending: number[] = [];
  let onPop: (state: unknown) => void = () => {};
  return {
    get state() {
      return stack[index];
    },
    pushState(state: unknown) {
      stack = stack.slice(0, index + 1);
      stack.push(state);
      index++;
    },
    replaceState(state: unknown) {
      stack[index] = state;
    },
    go(delta: number) {
      pending.push(delta);
    },
    listen(listener: (state: unknown) => void) {
      onPop = listener;
    },
    /** The phone's own back gesture. */
    back() {
      pending.push(-1);
      this.land();
    },
    /** Delivers every pending move, as the browser would. */
    land() {
      while (pending.length > 0) {
        index = Math.max(0, index + pending.shift()!);
        onPop(stack[index]);
      }
    },
    get length() {
      return index + 1;
    },
  };
}

function setUp() {
  const history = fakeHistory();
  const shown: { screen: Screen; direction: Direction }[] = [];
  const navigation = createNavigation(history, (screen, direction) => shown.push({ screen, direction }));
  history.listen((state) => navigation.pop(state));
  navigation.start({ name: "list" });
  const last = () => shown.at(-1);
  return { history, navigation, last };
}

describe("the phone's back gesture", () => {
  test("goes back a screen", () => {
    const { history, navigation, last } = setUp();
    navigation.go({ name: "inspection", id: "i1" });
    navigation.go({ name: "area", id: "a1" });

    history.back();

    expect(last()).toEqual({ screen: { name: "inspection", id: "i1" }, direction: "back" });
  });

  test("closes an open panel first, staying on the screen", () => {
    const { history, navigation, last } = setUp();
    navigation.go({ name: "item", id: "t1" });
    let closed = false;
    navigation.openPanel(() => (closed = true));

    history.back();

    expect(closed).toBe(true);
    expect(last()?.screen).toEqual({ name: "item", id: "t1" });
  });

  test("closes the panel that replaced another in the same moment, not the screen", () => {
    const { history, navigation, last } = setUp();
    navigation.go({ name: "item", id: "t1" });
    const picker = navigation.openPanel(() => {});
    // The Defect picker hands over to the Defect form: one closes as the other opens.
    picker.close();
    let formClosed = false;
    navigation.openPanel(() => (formClosed = true));
    history.land();
    expect(formClosed).toBe(false);

    history.back();

    expect(formClosed).toBe(true);
    expect(last()?.screen).toEqual({ name: "item", id: "t1" });
  });

  test("after leaving from a panel, skips that panel on the way back", () => {
    const { history, navigation, last } = setUp();
    navigation.go({ name: "area", id: "a1" });
    navigation.openPanel(() => {});
    // An Item added from the Add Item panel opens that Item.
    navigation.go({ name: "item", id: "t1" });

    history.back();

    expect(last()).toEqual({ screen: { name: "area", id: "a1" }, direction: "back" });
    history.back();
    expect(last()?.screen).toEqual({ name: "list" });
  });

  test("returning to an Area doesn't reopen Add Item", () => {
    const { history, navigation, last } = setUp();
    navigation.go({ name: "area", id: "a1", addingItem: true });
    navigation.go({ name: "item", id: "t1" });

    history.back();

    expect(last()?.screen).toEqual({ name: "area", id: "a1" });
  });

  test("can't return to a replaced screen, such as Start Inspection", () => {
    const { history, navigation, last } = setUp();
    navigation.go({ name: "start", type: "move-in" });
    navigation.go({ name: "inspection", id: "i1" }, { replace: true });

    history.back();

    expect(last()?.screen).toEqual({ name: "list" });
  });
});

describe("going up to a parent", () => {
  test("goes back through history when the Inspector came from there", () => {
    const { history, navigation, last } = setUp();
    navigation.go({ name: "area", id: "a1" });
    navigation.go({ name: "item", id: "t1" });
    navigation.openPanel(() => {});

    navigation.up({ name: "area", id: "a1" });
    history.land();

    expect(last()).toEqual({ screen: { name: "area", id: "a1" }, direction: "back" });
    expect(history.length).toBe(2);
  });

  test("moves to the parent when the Inspector came from elsewhere", () => {
    const { history, navigation, last } = setUp();
    navigation.go({ name: "inspection", id: "i1" });
    // From the Inspection's list of AI Suggestions straight to an Item.
    navigation.go({ name: "item", id: "t1" });

    navigation.up({ name: "area", id: "a1" });

    expect(last()).toEqual({ screen: { name: "area", id: "a1" }, direction: "back" });
    history.back();
    expect(last()?.screen).toEqual({ name: "item", id: "t1" });
  });
});
