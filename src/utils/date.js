/**
 * Format date to Indonesian locale (e.g., 1 Oktober 2026)
 * @param {string|Date} dateString 
 * @param {boolean} includeTime 
 * @returns {string}
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Intl.DateTimeFormat('id-ID', options).format(date);
};
