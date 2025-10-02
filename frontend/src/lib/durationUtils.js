/**
 * Duration utility functions for frontend
 */

/**
 * Calculate duration between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Duration object with years, months, days, hours, minutes
 */
export function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  
  if (startDate >= endDate) {
    return null;
  }
  
  let remaining = endDate - startDate;
  
  // Calculate minutes first
  const totalMinutes = Math.floor(remaining / (1000 * 60));
  
  // Calculate approximate years, months, days, hours, minutes
  const years = Math.floor(totalMinutes / (365 * 24 * 60));
  const remainingAfterYears = totalMinutes % (365 * 24 * 60);
  
  const months = Math.floor(remainingAfterYears / (30 * 24 * 60));
  const remainingAfterMonths = remainingAfterYears % (30 * 24 * 60);
  
  const days = Math.floor(remainingAfterMonths / (24 * 60));
  const remainingAfterDays = remainingAfterMonths % (24 * 60);
  
  const hours = Math.floor(remainingAfterDays / 60);
  const minutes = remainingAfterDays % 60;
  
  return {
    years,
    months,
    days,
    hours,
    minutes
  };
}

/**
 * Add duration to a date
 * @param {Date} date - The base date
 * @param {Object} duration - Duration object with years, months, days, hours, minutes
 * @returns {Date} New date with duration added
 */
export function addToDate(date, duration) {
  if (!date || !duration) return new Date(date);
  
  const result = new Date(date);
  
  // Add years and months first (they can affect day count)
  if (duration.years) {
    result.setFullYear(result.getFullYear() + duration.years);
  }
  
  if (duration.months) {
    result.setMonth(result.getMonth() + duration.months);
  }
  
  // Add days
  if (duration.days) {
    result.setDate(result.getDate() + duration.days);
  }
  
  // Add hours and minutes
  if (duration.hours) {
    result.setHours(result.getHours() + duration.hours);
  }
  
  if (duration.minutes) {
    result.setMinutes(result.getMinutes() + duration.minutes);
  }
  
  return result;
}

/**
 * Format duration as human readable string
 * @param {Object} duration - Duration object
 * @returns {String} Formatted duration string
 */
export function formatDuration(duration) {
  if (!duration) return 'No duration';
  
  const parts = [];
  
  if (duration.years > 0) parts.push(`${duration.years} year${duration.years > 1 ? 's' : ''}`);
  if (duration.months > 0) parts.push(`${duration.months} month${duration.months > 1 ? 's' : ''}`);
  if (duration.days > 0) parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
  if (duration.hours > 0) parts.push(`${duration.hours} hour${duration.hours > 1 ? 's' : ''}`);
  if (duration.minutes > 0) parts.push(`${duration.minutes} minute${duration.minutes > 1 ? 's' : ''}`);
  
  return parts.length > 0 ? parts.join(', ') : 'No duration';
}

/**
 * Check if duration is zero or empty
 * @param {Object} duration - Duration object
 * @returns {Boolean} True if duration is zero or falsy
 */
export function isDurationEmpty(duration) {
  if (!duration) return true;
  
  const total = (duration.years || 0) + (duration.months || 0) + 
                (duration.days || 0) + (duration.hours || 0) + (duration.minutes || 0);
  
  return total === 0;
}