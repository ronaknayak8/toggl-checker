/**
 * Returns true if the description is invalid—
 * i.e., it’s neither a 3‑digit code nor contains an allowed keyword.
 */
export function isNameInvalid(description: string): boolean {
  const name = description.trim();

  // 1. Exact three‑digit code?
  const threeDigitRegex = /^\d{3}$/;
  if (threeDigitRegex.test(name)) {
    return false;
  }

  // 2. Contains one of the allowed keywords?
  const lower = name.toLowerCase();
  if (lower.includes("review notifications") ||
      lower.includes("reply")) {
    return false;
  }

  // 3. Otherwise, it’s invalid
  return true;
}
