/**
 * Utility to resolve full URL for files stored in backend /storage
 * Handles relative paths, absolute URLs, blob URLs, and data URLs
 */
export const resolveStorageUrl = (path) => {
  if (!path) return '';
  if (
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
  const backendOrigin = apiBase.replace(/\/api\/v1\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendOrigin}${cleanPath}`;
};

export default resolveStorageUrl;
