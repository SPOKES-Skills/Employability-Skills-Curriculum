/** Opening converts an older design but never saves it, so the shared copy keeps the older values until the first save. */
import { convertToStandard, convertAlternatives } from './standard-conversion.mjs';

export const CONVERTED_STATUS = 'Design updated to the standard, not saved yet';
export const CONVERTED_NOTE = ' This design was updated to the design standard and is not saved yet.';

/**
 * True when a stored v2 design opened with changes from conversion. A v1 design is already unsaved by its own key,
 * and a stored design that merely differs in shape from the one the page builds is not a conversion.
 */
export function convertedOnOpen(catalog, stored, keyOf, currentKey) {
  if (!stored || stored.schema === 'bespoke-selection/v1' || keyOf(stored) === currentKey) return false;
  return convertToStandard(catalog, stored.design).changes.length + convertAlternatives(catalog, stored.alternatives).changes.length > 0;
}
