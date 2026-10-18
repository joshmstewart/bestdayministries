export const REPLY_ATTACHMENT_LIMIT = 10 * 1024 * 1024;
export const REPLY_ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx';
const types: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
export interface ReplyFileInfo { name: string; type: string; size: number }
export function validateReplyAttachments(files: ReplyFileInfo[]): void {
  let total = 0;
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['heic', 'heif'].includes(ext) || /heic|heif/.test(file.type)) throw new Error('HEIC photos are not supported. Export as JPG or PNG before attaching.');
    if (!file.name || file.name.length > 255 || /[\x00-\x1f/\\]/.test(file.name)) throw new Error('Invalid attachment filename.');
    if (!types[ext] || (file.type && file.type !== types[ext] && file.type !== 'application/octet-stream')) throw new Error(`${file.name}: attach JPG, PNG, GIF, WebP, PDF, Word or Excel files only.`);
    if (!Number.isSafeInteger(file.size) || file.size <= 0) throw new Error(`${file.name}: the attachment is empty or invalid.`);
    total += file.size;
    if (total > REPLY_ATTACHMENT_LIMIT) throw new Error('Attachments must total 10 MB or less per reply.');
  }
}
export function replyAttachmentType(name: string): string { return types[name.split('.').pop()?.toLowerCase() || ''] || ''; }
export function validateReplyFileBytes(name: string, bytes: Uint8Array): void {
  const type = replyAttachmentType(name);
  const starts = (...prefix: number[]) => prefix.every((b, i) => bytes[i] === b);
  const text = (start: number, length: number) => new TextDecoder().decode(bytes.slice(start, start + length));
  const valid = type === 'image/jpeg' ? starts(255,216,255)
    : type === 'image/png' ? starts(137,80,78,71,13,10,26,10)
    : type === 'image/gif' ? ['GIF87a','GIF89a'].includes(text(0,6))
    : type === 'image/webp' ? text(0,4) === 'RIFF' && text(8,4) === 'WEBP'
    : type === 'application/pdf' ? text(0,5) === '%PDF-'
    : /openxmlformats/.test(type) ? starts(80,75,3,4)
    : starts(208,207,17,224,161,177,26,225);
  if (!valid) throw new Error(`${name}: file content does not match its file type.`);
}