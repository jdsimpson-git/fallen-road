import type { ActiveHitZone, CircleShape, RectShape, Vec2 } from './types';

/** Squared distance from segment AB to point P. */
const segmentPointDistanceSq = (a: Vec2, b: Vec2, p: Vec2): number => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  let t = 0;
  if (lengthSq > 0) {
    t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq;
    t = Math.max(0, Math.min(1, t));
  }
  const cx = a.x + t * abx - p.x;
  const cy = a.y + t * aby - p.y;
  return cx * cx + cy * cy;
};

export const segmentIntersectsCircle = (
  a: Vec2,
  b: Vec2,
  circle: CircleShape
): boolean => {
  const center = { x: circle.x, y: circle.y };
  return segmentPointDistanceSq(a, b, center) <= circle.radius * circle.radius;
};

const orientation = (a: Vec2, b: Vec2, c: Vec2): number =>
  Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));

const segmentsIntersect = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  // Collinear overlap cases are close enough to "touching" for combat.
  const onSegment = (p: Vec2, q: Vec2, r: Vec2): boolean =>
    Math.min(p.x, r.x) <= q.x &&
    q.x <= Math.max(p.x, r.x) &&
    Math.min(p.y, r.y) <= q.y &&
    q.y <= Math.max(p.y, r.y);
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
};

const pointInRect = (p: Vec2, rect: RectShape): boolean =>
  Math.abs(p.x - rect.x) <= rect.halfWidth &&
  Math.abs(p.y - rect.y) <= rect.halfHeight;

export const segmentIntersectsRect = (
  a: Vec2,
  b: Vec2,
  rect: RectShape
): boolean => {
  if (pointInRect(a, rect) || pointInRect(b, rect)) return true;
  const left = rect.x - rect.halfWidth;
  const right = rect.x + rect.halfWidth;
  const top = rect.y - rect.halfHeight;
  const bottom = rect.y + rect.halfHeight;
  const corners: [Vec2, Vec2][] = [
    [
      { x: left, y: top },
      { x: right, y: top },
    ],
    [
      { x: right, y: top },
      { x: right, y: bottom },
    ],
    [
      { x: right, y: bottom },
      { x: left, y: bottom },
    ],
    [
      { x: left, y: bottom },
      { x: left, y: top },
    ],
  ];
  return corners.some(([c, d]) => segmentsIntersect(a, b, c, d));
};

export const segmentIntersectsZone = (
  a: Vec2,
  b: Vec2,
  zone: ActiveHitZone
): boolean =>
  zone.shape.type === 'circle'
    ? segmentIntersectsCircle(a, b, zone.shape)
    : segmentIntersectsRect(a, b, zone.shape);

/**
 * Test a gesture path against the active hit zones and return the
 * highest-priority zone the path crosses, or null on a whiff.
 */
export const resolveHit = (
  path: readonly Vec2[],
  zones: readonly ActiveHitZone[]
): ActiveHitZone | null => {
  let best: ActiveHitZone | null = null;
  for (const zone of zones) {
    if (best && zone.priority <= best.priority) continue;
    for (let i = 1; i < path.length; i++) {
      if (segmentIntersectsZone(path[i - 1]!, path[i]!, zone)) {
        best = zone;
        break;
      }
    }
  }
  return best;
};
