import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

/** How far the row slides to show Delete, in pixels. */
const REVEAL_PX = 96;

/** A drag shorter than this is a tap, so the buttons in the row still work. */
const DRAG_THRESHOLD_PX = 8;

/**
 * A row that slides left to show a Delete button underneath. A swipe on a phone does it; a drag with a mouse does too,
 * and focusing Delete with the keyboard slides the row open, so nobody needs the gesture. Tapping the row while it is
 * open closes it again.
 */
export function SwipeToDelete({ label, onDelete, children }: { label: string; onDelete: () => void; children: ReactNode }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; from: number } | null>(null);
  /** The last gesture was a drag, so the click that follows it is not a tap. */
  const dragged = useRef(false);

  function down(event: PointerEvent) {
    start.current = { x: event.clientX, y: event.clientY, from: offset };
    dragged.current = false;
  }

  function move(event: PointerEvent) {
    const origin = start.current;
    if (!origin) return;
    const dx = event.clientX - origin.x;
    if (!dragging) {
      // Mostly vertical is the page scrolling; the row stays put.
      if (Math.abs(dx) < DRAG_THRESHOLD_PX || Math.abs(dx) < Math.abs(event.clientY - origin.y)) return;
      setDragging(true);
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setOffset(Math.min(0, Math.max(-REVEAL_PX, origin.from + dx)));
  }

  function up() {
    start.current = null;
    if (!dragging) return;
    setDragging(false);
    setOffset((current) => (current < -REVEAL_PX / 2 ? -REVEAL_PX : 0));
  }

  /** A tap on the open row closes it instead of pressing what is under the finger. */
  function clickFace(event: React.MouseEvent) {
    if (dragged.current || offset !== 0) {
      event.preventDefault();
      event.stopPropagation();
      if (!dragged.current) setOffset(0);
      dragged.current = false;
    }
  }

  return (
    <div className="swipe-row">
      <button
        type="button"
        className="swipe-delete"
        aria-label={label}
        tabIndex={offset === 0 ? -1 : 0}
        onFocus={() => setOffset(-REVEAL_PX)}
        onBlur={() => setOffset(0)}
        onClick={() => {
          setOffset(0);
          onDelete();
        }}
      >
        <Trash2 aria-hidden="true" />
        Delete
      </button>
      <div
        className={`swipe-face${dragging ? " dragging" : ""}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={clickFace}
      >
        {children}
      </div>
    </div>
  );
}
