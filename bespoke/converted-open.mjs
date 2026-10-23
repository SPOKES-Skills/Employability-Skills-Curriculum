/** Opening converts an older design but never saves it, so the shared copy keeps the older values until the first save. */
export const CONVERTED_STATUS = 'Design updated to the standard, not saved yet';
export const CONVERTED_NOTE = ' This design was updated to the design standard and is not saved yet.';

/** True when a stored v2 design opened as a different, converted design. A v1 design is already unsaved by its own key. */
export const convertedOnOpen = (stored, keyOf, currentKey) => Boolean(stored) && stored.schema !== 'bespoke-selection/v1' && keyOf(stored) !== currentKey;
