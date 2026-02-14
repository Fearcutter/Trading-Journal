export function getStorageUsage(): { used: number; usedFormatted: string; percentage: number } {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += localStorage.getItem(key)?.length || 0;
    }
  }
  // localStorage is typically 5-10MB per origin
  const maxBytes = 5 * 1024 * 1024; // 5MB conservative
  const usedBytes = total * 2; // UTF-16 encoding = 2 bytes per char

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return {
    used: usedBytes,
    usedFormatted: formatSize(usedBytes),
    percentage: (usedBytes / maxBytes) * 100,
  };
}
