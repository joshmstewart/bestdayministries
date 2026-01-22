import { create } from 'zustand';

interface FeedBadgeState {
  unseenCount: number;
  lastSeenAt: string | null;
  showBadge: boolean;
  loading: boolean;
  setUnseenCount: (count: number) => void;
  setLastSeenAt: (timestamp: string | null) => void;
  setShowBadge: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  markAsSeen: () => void;
}

export const useFeedBadgeStore = create<FeedBadgeState>((set) => ({
  unseenCount: 0,
  lastSeenAt: null,
  showBadge: true,
  loading: true,
  setUnseenCount: (count) => set({ unseenCount: count }),
  setLastSeenAt: (timestamp) => set({ lastSeenAt: timestamp }),
  setShowBadge: (show) => set({ showBadge: show }),
  setLoading: (loading) => set({ loading }),
  markAsSeen: () => set({ unseenCount: 0 }),
}));
