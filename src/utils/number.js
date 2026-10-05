/**
 * Format number to Indonesian locale (e.g., 1.250)
 * @param {number|string} number 
 * @returns {string}
 */
export const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  
  const num = Number(number);
  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('id-ID').format(num);
};
