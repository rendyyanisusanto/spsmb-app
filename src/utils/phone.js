/**
 * Normalize WhatsApp number to format 62xxx
 * @param {string} phone 
 * @returns {string}
 */
export const normalizeWhatsApp = (phone) => {
  if (!phone) return '';
  // Remove non-numeric characters
  let normalized = phone.replace(/\D/g, '');
  
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  } else if (normalized.startsWith('8')) {
    normalized = '62' + normalized;
  }
  
  return normalized;
};

/**
 * Format phone for display (e.g. 0812-3456-7890)
 * @param {string} phone 
 * @returns {string}
 */
export const formatPhoneDisplay = (phone) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as 08xx-xxxx-xxxx if it starts with 62 or 0
  let localFormat = cleaned;
  if (localFormat.startsWith('62')) {
    localFormat = '0' + localFormat.substring(2);
  }

  // Add dashes for readability if length is reasonable
  if (localFormat.length >= 10 && localFormat.length <= 13) {
    const p1 = localFormat.substring(0, 4);
    const p2 = localFormat.substring(4, 8);
    const p3 = localFormat.substring(8);
    return `${p1}-${p2}-${p3}`;
  }
  
  return phone;
};
