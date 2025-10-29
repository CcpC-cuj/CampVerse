/**
 * Google Calendar Integration Utilities
 */

/**
 * Generate Google Calendar add event link
 * @param {Object} event - Event object with title, description, date, location
 * @returns {string} Google Calendar URL
 */
export function generateGoogleCalendarLink(event) {
  if (!event) return '';
  
  const baseUrl = 'https://calendar.google.com/calendar/render';
  
  // Format date to Google Calendar format (YYYYMMDDTHHMMSSZ)
  const formatDateForGoogle = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  // Calculate end time (assume 2 hours if not specified)
  const startDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Event',
    dates: `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`,
    details: event.description || event.about || '',
    location: event.location?.venue || event.location?.link || event.location?.type || '',
    ctz: 'Asia/Kolkata', // Indian timezone
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Open Google Calendar to add event
 * @param {Object} event - Event object
 */
export function addToGoogleCalendar(event) {
  const url = generateGoogleCalendarLink(event);
  window.open(url, '_blank', 'width=700,height=600');
}

/**
 * Download .ics file for calendar import
 * @param {Object} event - Event object
 */
export function downloadICSFile(event) {
  if (!event) return;
  
  const formatDateForICS = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const startDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampVerse//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatDateForICS(startDate)}`,
    `DTEND:${formatDateForICS(endDate)}`,
    `SUMMARY:${event.title || 'Event'}`,
    `DESCRIPTION:${(event.description || event.about || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location?.venue || event.location?.link || event.location?.type || ''}`,
    `UID:${event._id}@campverse.com`,
    `DTSTAMP:${formatDateForICS(new Date())}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${event.title?.replace(/[^a-z0-9]/gi, '_') || 'event'}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Check if browser supports calendar features
 */
export function isCalendarSupported() {
  return typeof window !== 'undefined' && window.open;
}
