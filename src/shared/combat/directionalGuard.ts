import type { BlockStanceDefinition } from '../balance/enemies';
import type { SwipeDirection } from './types';

/**
 * A stance stops a strike when it covers the target zone or the swipe
 * direction. Anything else slips past the guard entirely — a "blocking"
 * enemy in the wrong stance still takes the full hit.
 */
export const isStrikeBlocked = (
  stance: BlockStanceDefinition,
  zoneId: string,
  direction: SwipeDirection
): boolean =>
  stance.blockedZones.includes(zoneId) ||
  stance.blockedDirections.includes(direction);
