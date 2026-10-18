import { describe, expect, it } from 'vitest';
import { REPLY_ATTACHMENT_LIMIT, validateReplyAttachments, validateReplyFileBytes } from '../../supabase/functions/_shared/replyAttachments';
describe('admin reply attachment rules', () => {
  it('accepts exactly 10 MB total and rejects more across files', () => {
    expect(REPLY_ATTACHMENT_LIMIT).toBe(10485760);
    const files = [{ name: 'a.pdf', type: 'application/pdf', size: 5242880 }, { name: 'b.png', type: 'image/png', size: 5242880 }];
    expect(() => validateReplyAttachments(files)).not.toThrow();
    expect(() => validateReplyAttachments([...files, { name: 'c.pdf', type: 'application/pdf', size: 1 }])).toThrow();
  });
  it('accepts the requested image, PDF, Word and Excel extensions', () => {
    for (const ext of ['jpg','jpeg','png','gif','webp','pdf','doc','docx','xls','xlsx']) expect(() => validateReplyAttachments([{ name: `file.${ext}`, type: '', size: 1 }])).not.toThrow();
    expect(() => validateReplyAttachments([{ name: 'file.exe', type: '', size: 1 }])).toThrow();
  });
  it('clearly rejects HEIC instead of sending unusable photos', () => { expect(() => validateReplyAttachments([{ name: 'photo.heic', type: 'image/heic', size: 1 }])).toThrow(/Export as JPG/); });
  it('rejects mismatched MIME and spoofed file signatures', () => {
    expect(() => validateReplyAttachments([{ name: 'a.pdf', type: 'image/png', size: 1 }])).toThrow();
    expect(() => validateReplyFileBytes('a.pdf', new TextEncoder().encode('not a pdf'))).toThrow();
    expect(() => validateReplyFileBytes('a.pdf', new TextEncoder().encode('%PDF-1.4'))).not.toThrow();
  });
  it('rejects empty files and path-like filenames', () => {
    expect(() => validateReplyAttachments([{ name: 'a.pdf', type: '', size: 0 }])).toThrow();
    expect(() => validateReplyAttachments([{ name: '../a.pdf', type: '', size: 1 }])).toThrow();
  });
});