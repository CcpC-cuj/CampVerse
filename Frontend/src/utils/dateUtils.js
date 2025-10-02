/**
 * Date utility functions for handling timezone conversions and formatting
 * Ensures consistent handling of IST (UTC+5:30) timezone
 */

/**
/**
 * Format a date string/object to a locale string in a specified timezone
 * @param {string|Date} dateString - Date string or Date object (typically in UTC from backend)
 * @param {Object} options - Intl.DateTimeFormat options
 * @param {string} timeZone - IANA timezone string (default: 'Asia/Kolkata')
 * @returns {string} Formatted date string in specified timezone
 */
export function formatDateWithTZ(dateString, options = {}, timeZone = 'Asia/Kolkata') {
  if (!dateString) return 'Date TBD';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const defaultOptions = {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return date.toLocaleString('en-IN', defaultOptions);
}

/**
 * Format date to short format (e.g., "Jan 15, 2024, 10:30 AM")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export function formatDateShort(dateString) {
  if (!dateString) return 'Date TBD';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date to long format with weekday
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export function formatDateLong(dateString) {
  if (!dateString) return 'Date TBD';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Convert local datetime-local input value to UTC ISO string for backend
 * @param {string} localDateTimeString - Value from datetime-local input
 * @returns {string} ISO string in UTC
 */
export function localToUTC(localDateTimeString) {
  if (!localDateTimeString) return null;
  
  // datetime-local gives us a string like "2024-01-15T10:30"
  // Browser interprets this in local timezone
  const date = new Date(localDateTimeString);
  return date.toISOString();
}

/**
 * Convert UTC date to local datetime-local input format
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {string} Format suitable for datetime-local input (YYYY-MM-DDTHH:mm)
 */
export function utcToLocal(utcDate) {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  if (isNaN(date.getTime())) return '';
  
  // Get local time components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Relative time string
 */
export function getRelativeTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date - now;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60 && diffSecs >= 0) return 'Starting soon';
  if (diffSecs < 0 && diffSecs > -60) return 'Just started';
  if (diffMins < 60 && diffMins > 0) return `Starting in ${diffMins} minute${diffMins === 1 ? '' : 's'}`;
  if (diffMins < 0 && diffMins > -60) return `Started ${-diffMins} minute${diffMins === -1 ? '' : 's'} ago`;
  if (diffHours < 24 && diffHours > 0) return `Starting in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
  if (diffHours < 0 && diffHours > -24) return `Started ${-diffHours} hour${diffHours === -1 ? '' : 's'} ago`;
  if (diffDays > 0 && diffDays < 7) return `Starting in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  if (diffDays < 0 && diffDays > -7) return `${-diffDays} day${diffDays === -1 ? '' : 's'} ago`;
  
  return formatDateShort(dateString);
}

/**
 * Check if event is upcoming, ongoing, or past
 * @param {string|Date} startDate - Event start date
 * @param {string|Date} endDate - Event end date (optional)
 * @returns {string} 'upcoming' | 'ongoing' | 'past'
 */
export function getEventStatus(startDate, endDate = null) {
  const now = new Date();
  const start = new Date(startDate);
  
  if (isNaN(start.getTime())) return 'unknown';
  
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      if (now < start) return 'upcoming';
      if (now >= start && now <= end) return 'ongoing';
      return 'past';
    }
  }
  
  // If no end date, consider event as 1 day duration
  if (now < start) return 'upcoming';
  const oneDayAfter = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  if (now <= oneDayAfter) return 'ongoing';
  return 'past';
}
