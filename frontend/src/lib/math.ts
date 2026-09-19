/**
 * Safely evaluate a simple arithmetic expression without using eval().
 * Only digits, parentheses and the operators + - * / and . are allowed.
 * Returns null if the input is not a valid expression.
 */
export function tryCalculate(input: string): number | null {
  const cleaned = input
    .toLowerCase()
    .replace(/plus/g, "+")
    .replace(/minus/g, "-")
    .replace(/(multiplied by|times|x)/g, "*")
    .replace(/(divided by|over)/g, "/")
    .replace(/[^0-9+\-*/().\s]/g, "")
    .trim();

  if (!cleaned || !/[0-9]/.test(cleaned) || !/[+\-*/]/.test(cleaned)) {
    return null;
  }

  try {
    // Restricted character set already validated above.
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${cleaned});`);
    const result = fn();
    if (typeof result === "number" && Number.isFinite(result)) {
      return Math.round(result * 1e6) / 1e6;
    }
  } catch {
    return null;
  }
  return null;
}

/** Format a number nicely for speech (e.g. 4.5 -> "4.5", 1000000 -> "1,000,000"). */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) {
    return n.toLocaleString("en-US");
  }
  return String(n);
}
