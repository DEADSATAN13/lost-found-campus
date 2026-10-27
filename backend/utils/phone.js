/**
 * Utility for validating and normalizing Indian mobile phone numbers.
 * Accepts prefixes: +91, 91, 0, along with spaces, hyphens, and parentheses.
 * Validates that the normalized number is 10 digits starting with 6, 7, 8, or 9.
 */

// Normalizes an Indian phone number string to a canonical 10-digit format
export function normalizePhone(rawPhone) {
  if (rawPhone === undefined || rawPhone === null) return null;

  // Coerce input to string and strip spaces, hyphens, and parentheses
  const cleaned = String(rawPhone).trim().replace(/[\s\-()]/g, '');
  if (!cleaned) return null;

  let digits = cleaned;

  // Handle +91 international prefix
  if (digits.startsWith('+91')) {
    digits = digits.slice(3);
  }
  // Handle 91 prefix when followed by 10 digits (total length 12)
  else if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  }
  // Handle trunk prefix 0 when followed by 10 digits (total length 11)
  else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Ensure exactly 10 digits starting with 6-9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (indianMobileRegex.test(digits)) {
    return digits;
  }

  return null;
}

// Quick validation helper
export function isValidPhone(rawPhone) {
  return normalizePhone(rawPhone) !== null;
}
