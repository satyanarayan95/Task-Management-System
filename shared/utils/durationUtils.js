/**
 * Duration utility functions for task timing calculations
 */

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
 * Calculate duration between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Duration object with years, months, days, hours, minutes
 */
export function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  
  if (startDate >= endDate) {
    throw new Error('End date must be after start date');
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
 * Convert duration to total minutes
 * @param {Object} duration - Duration object
 * @returns {Number} Total minutes
 */
export function toMinutes(duration) {
  if (!duration) return 0;
  
  let total = 0;
  total += (duration.years || 0) * 365 * 24 * 60; // Approximate
  total += (duration.months || 0) * 30 * 24 * 60;  // Approximate
  total += (duration.days || 0) * 24 * 60;
  total += (duration.hours || 0) * 60;
  total += (duration.minutes || 0);
  
  return total;
}

/**
 * Convert minutes to duration object
 * @param {Number} totalMinutes - Total minutes
 * @returns {Object} Duration object
 */
export function fromMinutes(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0 };
  }
  
  let remaining = totalMinutes;
  
  const years = Math.floor(remaining / (365 * 24 * 60));
  remaining %= (365 * 24 * 60);
  
  const months = Math.floor(remaining / (30 * 24 * 60));
  remaining %= (30 * 24 * 60);
  
  const days = Math.floor(remaining / (24 * 60));
  remaining %= (24 * 60);
  
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  
  return {
    years,
    months,
    days,
    hours,
    minutes
  };
}

/**
 * Format duration as human readable string
 * @param {Object} duration - Duration object
 * @param {Object} options - Formatting options
 * @returns {String} Formatted duration string
 */
export function format(duration, options = {}) {
  if (!duration) return '0 minutes';
  
  const {
    compact = false,
    includeZero = false,
    maxUnits = 3
  } = options;
  
  const parts = [];
  
  const units = [
    { key: 'years', label: 'year', plural: 'years' },
    { key: 'months', label: 'month', plural: 'months' },
    { key: 'days', label: 'day', plural: 'days' },
    { key: 'hours', label: 'hour', plural: 'hours' },
    { key: 'minutes', label: 'minute', plural: 'minutes' }
  ];
  
  for (const unit of units) {
    const value = duration[unit.key] || 0;
    
    if (value > 0 || (includeZero && parts.length === 0)) {
      const label = value === 1 ? unit.label : unit.plural;
      
      if (compact) {
        parts.push(`${value}${unit.key.charAt(0)}`);
      } else {
        parts.push(`${value} ${label}`);
      }
      
      if (parts.length >= maxUnits) break;
    }
  }
  
  if (parts.length === 0) {
    return includeZero ? '0 minutes' : '';
  }
  
  return compact ? parts.join(' ') : parts.join(', ');
}

/**
 * Validate duration object
 * @param {Object} duration - Duration object to validate
 * @returns {Object} Validation result with valid flag and errors
 */
export function validate(duration) {
  if (!duration) {
    return { valid: false, errors: ['Duration is required'] };
  }
  
  const errors = [];
  
  // Check for negative values
  if (duration.years < 0) errors.push('Years cannot be negative');
  if (duration.months < 0) errors.push('Months cannot be negative');
  if (duration.days < 0) errors.push('Days cannot be negative');
  if (duration.hours < 0) errors.push('Hours cannot be negative');
  if (duration.minutes < 0) errors.push('Minutes cannot be negative');
  
  // Check for maximum values
  if (duration.years > 99) errors.push('Years cannot exceed 99');
  if (duration.months > 11) errors.push('Months cannot exceed 11');
  if (duration.days > 30) errors.push('Days cannot exceed 30');
  if (duration.hours > 23) errors.push('Hours cannot exceed 23');
  if (duration.minutes > 59) errors.push('Minutes cannot exceed 59');
  
  // Check if at least one value is positive
  const total = (duration.years || 0) + (duration.months || 0) + 
                (duration.days || 0) + (duration.hours || 0) + (duration.minutes || 0);
  
  if (total === 0) {
    errors.push('Duration must have at least one positive value');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Compare two duration objects
 * @param {Object} duration1 - First duration
 * @param {Object} duration2 - Second duration
 * @returns {Number} -1 if duration1 < duration2, 0 if equal, 1 if duration1 > duration2
 */
export function compare(duration1, duration2) {
  const minutes1 = toMinutes(duration1);
  const minutes2 = toMinutes(duration2);
  
  if (minutes1 < minutes2) return -1;
  if (minutes1 > minutes2) return 1;
  return 0;
}

/**
 * Check if duration is zero
 * @param {Object} duration - Duration object
 * @returns {Boolean} True if duration is zero or falsy
 */
export function isZero(duration) {
  if (!duration) return true;
  
  const total = (duration.years || 0) + (duration.months || 0) + 
                (duration.days || 0) + (duration.hours || 0) + (duration.minutes || 0);
  
  return total === 0;
}

/**
 * Add two durations together
 * @param {Object} duration1 - First duration
 * @param {Object} duration2 - Second duration
 * @returns {Object} Sum of durations
 */
export function add(duration1, duration2) {
  const result = {
    years: (duration1?.years || 0) + (duration2?.years || 0),
    months: (duration1?.months || 0) + (duration2?.months || 0),
    days: (duration1?.days || 0) + (duration2?.days || 0),
    hours: (duration1?.hours || 0) + (duration2?.hours || 0),
    minutes: (duration1?.minutes || 0) + (duration2?.minutes || 0)
  };
  
  // Normalize the duration (carry over values)
  if (result.minutes >= 60) {
    result.hours += Math.floor(result.minutes / 60);
    result.minutes = result.minutes % 60;
  }
  
  if (result.hours >= 24) {
    result.days += Math.floor(result.hours / 24);
    result.hours = result.hours % 24;
  }
  
  if (result.days >= 30) {
    result.months += Math.floor(result.days / 30);
    result.days = result.days % 30;
  }
  
  if (result.months >= 12) {
    result.years += Math.floor(result.months / 12);
    result.months = result.months % 12;
  }
  
  return result;
}

/**
 * Subtract one duration from another
 * @param {Object} duration1 - First duration (minuend)
 * @param {Object} duration2 - Second duration (subtrahend)
 * @returns {Object} Difference of durations
 */
export function subtract(duration1, duration2) {
  const totalMinutes1 = toMinutes(duration1);
  const totalMinutes2 = toMinutes(duration2);
  
  if (totalMinutes1 < totalMinutes2) {
    throw new Error('Cannot subtract: first duration is smaller than second');
  }
  
  return fromMinutes(totalMinutes1 - totalMinutes2);
}