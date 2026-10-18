import { useRef, useState } from 'react';
import { Paperclip, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { REPLY_ATTACHMENT_ACCEPT, validateReplyAttachments, type ThreadAttachment } from '@/lib/contactReplyAttachments';
import { openOrDownloadAttachment } from '@/lib/downloadFile';
import { showErrorToast } from '@/lib/errorToast';

export function ReplyAttachments({ files, onChange, disabled }: { files: File[]; onChange: (files: File[]) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  return <div className="space-y-2">
    <input ref={input} type="file" multiple accept={REPLY_ATTACHMENT_ACCEPT} aria-label="Reply attachments" className="hidden" disabled={disabled} onChange={event => {
      try {
        const next = [...files, ...Array.from(event.target.files || [])];
        validateReplyAttachments(next); onChange(next); setError('');
      } catch (err) { const message = err instanceof Error ? err.message : 'Invalid attachment'; setError(message); showErrorToast(message); }
      event.target.value = '';
    }} />
    <div className="flex items-center gap-3 flex-wrap">
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}><Paperclip className="h-4 w-4 mr-2" />Attach files</Button>
      <span className="text-xs text-muted-foreground">{(files.reduce((n, f) => n + f.size, 0) / (1024 * 1024)).toFixed(2)} / 10 MB</span>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {files.map((file, i) => <div key={`${file.name}-${i}`} className="flex items-center gap-2 text-sm">
      <Paperclip className="h-4 w-4 shrink-0" /><span className="break-all min-w-0 flex-1">{file.name}</span>
      <Button type="button" size="icon" variant="ghost" title={`Remove ${file.name}`} aria-label={`Remove ${file.name}`} disabled={disabled} onClick={() => { onChange(files.filter((_, index) => index !== i)); setError(''); }}><X className="h-4 w-4" /></Button>
    </div>)}
  </div>;
}
export function ReplyAttachmentHistory({ attachments }: { attachments?: ThreadAttachment[] | null }) {
  if (!Array.isArray(attachments) || !attachments.length) return null;
  return <div className="mt-2 space-y-1">{attachments.map((file, i) => <Button key={i} type="button" variant="link" size="sm" className="h-auto whitespace-normal text-left justify-start max-w-full" onClick={() => openOrDownloadAttachment(file.url, file.name, file.type)}><Download className="h-3 w-3 mr-2 shrink-0" /><span className="break-all">{file.name}</span></Button>)}</div>;
}