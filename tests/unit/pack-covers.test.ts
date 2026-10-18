import { describe, it, expect } from 'vitest';
import { getPackCovers, pickRotatingPackCover } from '@/lib/packCovers';
import { validatePackCoverMode, validatePackImageUrls } from '../../supabase/functions/sticker-admin-api/packCoverValidation';

describe('visual pack cover rules', () => {
  it('uses the legacy image exactly when the array is empty', () => {
    expect(getPackCovers({ pack_image_urls: [], pack_image_url: 'legacy.png' })).toEqual(['legacy.png']);
    expect(getPackCovers({ pack_image_url: null })).toEqual([]);
  });
  it('prefers multiple covers over the legacy image', () => {
    expect(getPackCovers({ pack_image_urls: ['one', 'two'], pack_image_url: 'old' })).toEqual(['one', 'two']);
  });
  it('never repeats consecutively with two or more distinct covers', () => {
    const covers = ['one', 'two', 'three'];
    let previous: string | null = null;
    for (let i = 0; i < 20; i++) {
      const selected = pickRotatingPackCover(covers, 'rotation-user', 'collection', () => 0);
      expect(covers).toContain(selected);
      expect(selected).not.toBe(previous);
      previous = selected;
    }
  });
  it('keeps cover history separate for each user and collection', () => {
    expect(pickRotatingPackCover(['a', 'b'], 'first', 'one', () => 0)).toBe('a');
    expect(pickRotatingPackCover(['a', 'b'], 'second', 'one', () => 0)).toBe('a');
    expect(pickRotatingPackCover(['a', 'b'], 'first', 'two', () => 0)).toBe('a');
    expect(pickRotatingPackCover(['a', 'b'], 'first', 'one', () => 0)).toBe('b');
  });
  it('allows repeated single covers and no-cover fallback', () => {
    expect(pickRotatingPackCover(['a', 'a'], 'single', 'one')).toBe('a');
    expect(pickRotatingPackCover(['a'], 'single', 'one')).toBe('a');
    expect(pickRotatingPackCover([], 'single', 'one')).toBeNull();
  });
  it('accepts only rotate or choose modes, defaulting when omitted', () => {
    expect(validatePackCoverMode('rotate')).toBeNull();
    expect(validatePackCoverMode('choose')).toBeNull();
    expect(validatePackCoverMode(undefined)).toBeNull();
    expect(validatePackCoverMode('random')).not.toBeNull();
  });
  it('enforces one to six URLs', () => {
    const origin = 'https://storage.example.test';
    const cover = `${origin}/storage/v1/object/public/sticker-images/generator/pack.png`;
    expect(validatePackImageUrls([cover], origin)).toBeNull();
    expect(validatePackImageUrls(Array(6).fill(cover), origin)).toBeNull();
    expect(validatePackImageUrls([], origin)).not.toBeNull();
    expect(validatePackImageUrls(Array(7).fill(cover), origin)).not.toBeNull();
  });
  it('accepts only this projects public sticker-images bucket', () => {
    const origin = 'https://storage.example.test';
    expect(validatePackImageUrls([`${origin}/storage/v1/object/public/sticker-images/a.png?v=1`], origin)).toBeNull();
    for (const url of [
      'https://other.example.test/storage/v1/object/public/sticker-images/a.png',
      `${origin}/storage/v1/object/public/other/a.png`,
      `${origin}/storage/v1/object/public/sticker-images/`,
      'not-a-url',
    ]) expect(validatePackImageUrls([url], origin)).not.toBeNull();
  });
});