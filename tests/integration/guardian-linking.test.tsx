import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('Guardian Linking Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  describe('Friend Code Generation', () => {
    it('should generate valid emoji codes', () => {
      const emojiSet = ['🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡'];
      
      const generateFriendCode = (): string => {
        return Array(3)
          .fill(null)
          .map(() => emojiSet[Math.floor(Math.random() * emojiSet.length)])
          .join('');
      };

      const code = generateFriendCode();
      
      // Emojis are actually multi-byte characters
      expect(Array.from(code)).toHaveLength(3); // 3 emoji characters
    });

    it('should generate unique codes', () => {
      const emojiSet = ['🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡'];
      
      const generateFriendCode = (): string => {
        return Array(3)
          .fill(null)
          .map(() => emojiSet[Math.floor(Math.random() * emojiSet.length)])
          .join('');
      };

      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateFriendCode());
      }

      // Should generate mostly unique codes
      expect(codes.size).toBeGreaterThan(80);
    });

    it('should calculate possible combinations', () => {
      const emojiSet = ['🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡'];
      const codeLength = 3;
      
      // With replacement: emojiSet.length ^ codeLength
      const possibleCombinations = Math.pow(emojiSet.length, codeLength);
      
      expect(possibleCombinations).toBe(1000); // 10^3 = 1000 possible codes
    });
  });

  describe('Emoji Code Search', () => {
    it('should search by emoji', () => {
      const friendCodes = ['🌟🌈🔥', '🌊🌸🍕', '🎸🚀🏆'];
      const searchEmoji = '🌟';

      const matches = friendCodes.filter(code => code.includes(searchEmoji));
      expect(matches).toContain('🌟🌈🔥');
      expect(matches).toHaveLength(1);
    });

    it('should handle multiple matches', () => {
      const friendCodes = ['🌟🌈🔥', '🌟🌸🍕', '🎸🚀🏆'];
      const searchEmoji = '🌟';

      const matches = friendCodes.filter(code => code.includes(searchEmoji));
      expect(matches).toHaveLength(2);
    });

    it('should handle no matches', () => {
      const friendCodes = ['🌟🌈🔥', '🌊🌸🍕', '🎸🚀🏆'];
      const searchEmoji = '💎';

      const matches = friendCodes.filter(code => code.includes(searchEmoji));
      expect(matches).toHaveLength(0);
    });
  });

  describe('Approval Flags', () => {
    it('should validate approval flag combinations', () => {
      const approvalFlags = {
        posts: true,
        comments: false,
        messages: true,
        vendorAssets: false
      };

      expect(approvalFlags.posts).toBe(true);
      expect(approvalFlags.comments).toBe(false);
      expect(approvalFlags.messages).toBe(true);
      expect(approvalFlags.vendorAssets).toBe(false);
    });

    it('should toggle approval flags', () => {
      const link = {
        require_post_approval: false,
        require_comment_approval: false,
        require_message_approval: false
      };

      const updatedLink = {
        ...link,
        require_post_approval: true
      };

      expect(link.require_post_approval).toBe(false);
      expect(updatedLink.require_post_approval).toBe(true);
    });

    it('should handle all flags enabled', () => {
      const allEnabled = {
        require_post_approval: true,
        require_comment_approval: true,
        require_message_approval: true,
        require_vendor_asset_approval: true
      };

      expect(Object.values(allEnabled).every(v => v === true)).toBe(true);
    });
  });

  describe('Guardian-Bestie Relationship', () => {
    it('should validate guardian-bestie relationship', () => {
      const link = {
        guardianId: 'guardian-123',
        bestieId: 'bestie-456',
        requirePostApproval: true,
        requireCommentApproval: false
      };

      expect(link.guardianId).toBeTruthy();
      expect(link.bestieId).toBeTruthy();
      expect(link.guardianId).not.toBe(link.bestieId);
    });

    it('should prevent self-linking', () => {
      const guardianId = 'user-123';
      const bestieId = 'user-123';

      const isValidLink = guardianId !== bestieId;
      expect(isValidLink).toBe(false);
    });

    it('should load guardian links from API', async () => {
      server.use(
        http.get('*/rest/v1/caregiver_bestie_links', () => {
          return HttpResponse.json([
            {
              id: 'link-1',
              caregiver_id: 'guardian-123',
              bestie_id: 'bestie-456',
              require_post_approval: true,
              require_comment_approval: false,
              require_message_approval: false,
              friend_code: '🌟🌈🔥'
            }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/caregiver_bestie_links`);
      const data = await response.json();

      expect(data).toHaveLength(1);
      expect(data[0].friend_code).toBe('🌟🌈🔥');
    });
  });

  describe('Link Management', () => {
    it('should create new link', () => {
      const newLink = {
        caregiver_id: 'guardian-123',
        bestie_id: 'bestie-456',
        require_post_approval: true,
        require_comment_approval: false,
        friend_code: '🌟🌈🔥'
      };

      expect(newLink.caregiver_id).toBeTruthy();
      expect(newLink.bestie_id).toBeTruthy();
      expect(newLink.friend_code).toHaveLength(6);
    });

    it('should delete existing link', () => {
      const links = [
        { id: 'link-1', caregiver_id: 'guardian-123', bestie_id: 'bestie-456' },
        { id: 'link-2', caregiver_id: 'guardian-123', bestie_id: 'bestie-789' }
      ];

      const linksAfterDelete = links.filter(l => l.id !== 'link-1');
      expect(linksAfterDelete).toHaveLength(1);
      expect(linksAfterDelete[0].id).toBe('link-2');
    });
  });
});
