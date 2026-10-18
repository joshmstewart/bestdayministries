import { supabase } from '@/integrations/supabase/client';
import { showErrorToast } from '@/lib/errorToast';

/**
 * Downloads a file via fetch + blob to bypass ad blockers
 * that block direct navigation to storage domains.
 */
export const downloadFile = async (url: string, filename: string) => {
  try {
    let blob: Blob;
    if (url.startsWith('private://contact-reply-attachments/')) {
      const path = url.slice('private://contact-reply-attachments/'.length);
      const { data, error } = await supabase.storage.from('contact-reply-attachments').download(path);
      if (error || !data) throw new Error('This private attachment could not be downloaded. Admin access is required.');
      blob = data;
    } else {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      blob = await response.blob();
    }
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    if (url.startsWith('private://')) { showErrorToast(error instanceof Error ? error.message : 'Attachment download failed'); return; }
    console.error("Download failed, falling back to direct open:", error);
    window.open(url, "_blank");
  }
};

/**
 * Downloads all attachments via fetch + blob to bypass ad blockers.
 */
export const openOrDownloadAttachment = (url: string, name: string, _type?: string) => {
  downloadFile(url, name);
};
