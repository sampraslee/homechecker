/** Brings a panel that opened off screen into view, without animating for people who asked the phone to reduce motion. */
export function scrollIntoViewGently(element: HTMLElement | null) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}
