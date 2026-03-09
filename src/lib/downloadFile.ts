/**
 * Downloads a file via fetch + blob to bypass ad blockers
 * that block direct navigation to storage domains.
 */
export const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed, falling back to direct open:", error);
    window.open(url, "_blank");
  }
};

/**
 * For PDF URLs, download via blob. For other files, open normally.
 */
export const openOrDownloadAttachment = (url: string, name: string, type?: string) => {
  const isPdf = type?.includes("pdf") || name?.toLowerCase().endsWith(".pdf") || url?.toLowerCase().includes(".pdf");
  if (isPdf) {
    downloadFile(url, name);
  } else {
    window.open(url, "_blank");
  }
};
