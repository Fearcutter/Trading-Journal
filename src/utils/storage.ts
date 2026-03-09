export async function getStorageUsage(): Promise<{ used: number; total: number; usedFormatted: string; totalFormatted: string; percentage: number }> {
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (navigator.storage?.estimate) {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      used: usage,
      total: quota,
      usedFormatted: formatSize(usage),
      totalFormatted: formatSize(quota),
      percentage: quota > 0 ? (usage / quota) * 100 : 0,
    };
  }

  // Fallback: unknown usage
  return {
    used: 0,
    total: 0,
    usedFormatted: 'Unknown',
    totalFormatted: 'Unknown',
    percentage: 0,
  };
}
