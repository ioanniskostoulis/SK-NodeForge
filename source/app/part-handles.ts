// Generic part handles live on visible electrical terminals, or on geometry ends for sheet objects.
import { TextElm, type CircuitElm } from "../engine";
import { chipLeadHandles, isLeadPart } from "./chip-handles";
import { isTransformer, transformerHandles } from "./transformer-geometry";

export type PartHandle = { x: number; y: number; end: 1 | 2 };

export function partHandles(part: CircuitElm): PartHandle[] {
  if (part instanceof TextElm) return [{ x: part.point1.x, y: part.point1.y, end: 1 }];
  if (part.getPostCount() === 0) return [
    { x: part.point1.x, y: part.point1.y, end: 1 },
    { x: part.point2.x, y: part.point2.y, end: 2 },
  ];
  const handles: PartHandle[] = [];
  for (let index = 0; index < part.getPostCount(); index++) {
    const post = part.getPost(index);
    if (handles.some((handle) => handle.x === post.x && handle.y === post.y)) continue;
    const distanceToStart = Math.hypot(post.x - part.point1.x, post.y - part.point1.y);
    const distanceToEnd = Math.hypot(post.x - part.point2.x, post.y - part.point2.y);
    handles.push({ x: post.x, y: post.y, end: distanceToStart <= distanceToEnd ? 1 : 2 });
  }
  return handles;
}

/** Every handle drawn on the selection, drawn and hidden together: the shell sizes them from the nearest two. */
export function selectionHandlePoints(selection: Iterable<CircuitElm>): { x: number; y: number }[] {
  const all: { x: number; y: number }[] = [];
  for (const e of selection) {
    if (isTransformer(e)) {
      const h = transformerHandles(e);
      all.push(h.top, h.bottom, ...Array.from({ length: e.getPostCount() }, (_, i) => e.getPost(i)));
    } else if (isLeadPart(e)) all.push(...chipLeadHandles(e));
    else all.push(...partHandles(e));
  }
  return all;
}
