/** Team access codes: 8 characters with no look-alikes (0/O, 1/I/L), shown as two groups of four. */
import { createHash, randomInt } from 'node:crypto';

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_MIN_LENGTH = 8;
const GROUP = 4;
const SHORT_CODE = new RegExp(`^[${CODE_ALPHABET}]{${GROUP * 2}}$`);

export function newAccessCode() {
  const chars = Array.from({ length: GROUP * 2 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  return `${chars.slice(0, GROUP)}-${chars.slice(GROUP)}`;
}

// A typed 8-character code ignores case, spaces and the dash. Older 32-character codes are
// case-sensitive, so anything that is not an 8-character code is hashed exactly as given.
function canonicalCode(code) {
  const given = String(code).trim();
  const compact = given.toUpperCase().replace(/[\s-]/g, '');
  return SHORT_CODE.test(compact) ? compact : given;
}

export function hashAccessCode(code) {
  return createHash('sha256').update(canonicalCode(code), 'utf8').digest('base64url');
}
