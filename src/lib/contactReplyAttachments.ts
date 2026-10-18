import { supabase } from '@/integrations/supabase/client';
import { validateReplyAttachments, validateReplyFileBytes, replyAttachmentType } from '../../supabase/functions/_shared/replyAttachments';
export { REPLY_ATTACHMENT_ACCEPT, validateReplyAttachments } from '../../supabase/functions/_shared/replyAttachments';
export interface ThreadAttachment { name: string; url: string; type: string; size: number }
export function parseThreadAttachments(value: unknown): ThreadAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter((file): file is ThreadAttachment => file && typeof file.name === 'string' && typeof file.url === 'string' && typeof file.type === 'string' && typeof file.size === 'number');
}
export async function encodeReplyFiles(files: File[]) {
  validateReplyAttachments(files);
  return Promise.all(files.map(async file => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateReplyFileBytes(file.name, bytes);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { name: file.name, type: replyAttachmentType(file.name), size: bytes.length, content: btoa(binary) };
  }));
}
export async function sendContactReply(body: { submissionId: string; replyMessage: string; adminNotes?: string; ccEmails?: string[] }, files: File[]) {
  const attachments = await encodeReplyFiles(files);
  const { data, error } = await supabase.functions.invoke('send-contact-reply', { body: { ...body, attachments } });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      const details = await error.context.json().catch(() => null);
      message = details?.error || message;
    }
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || 'Reply could not be sent.');
  return data;
}