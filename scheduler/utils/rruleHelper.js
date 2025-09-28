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

/**
 * Get all occurrences between two dates
 * @param {string} rruleString - The RRule string
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Date[]} Array of occurrence dates
 */
export function getOccurrencesBetween(rruleString, start, end) {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.between(start, end);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error parsing RRule:`, error);
    return [];
  }
}

/**
 * Validate if an RRule string is valid
 * @param {string} rruleString - The RRule string to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateRRule(rruleString) {
  try {
    RRule.fromString(rruleString);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a recurring pattern has more occurrences
 * @param {string} rruleString - The RRule string
 * @param {Date} after - Check after this date
 * @returns {boolean} True if there are more occurrences
 */
export function hasMoreOccurrences(rruleString, after = new Date()) {
  try {
    const rule = RRule.fromString(rruleString);
    const nextOccurrence = rule.after(after);
    return nextOccurrence !== null;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking RRule occurrences:`, error);
    return false;
  }
}

/**
 * Get a human-readable description of the RRule
 * @param {string} rruleString - The RRule string
 * @returns {string} Human-readable description
 */
export function getRRuleDescription(rruleString) {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.toText();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting RRule description:`, error);
    return 'Invalid recurring pattern';
  }
}