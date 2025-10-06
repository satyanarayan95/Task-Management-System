import pkg from 'rrule';
const { RRule } = pkg;

/**
 * Get the next occurrence date from an RRule string
 * @param {string} rruleString - The RRule string
 * @param {Date} after - Get next occurrence after this date (default: now)
 * @returns {Date|null} Next occurrence date or null if no more occurrences
 */
export function getNextOccurrence(rruleString, after = new Date()) {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.after(after);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error parsing RRule:`, error);
    return null;
  }
}
