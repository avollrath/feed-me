import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeedData, FeedRuntime, FeedSource, GlobalSettings, GridLayout, RefreshInterval } from '../types';

const defaultFeeds: FeedSource[] = [
  {
    id: 'wikipedia-on-this-day',
    label: 'Wikipedia: On This Day',
    url: 'https://de.wikipedia.org/w/api.php?action=featuredfeed&feed=onthisday&feedformat=atom',
    enabled: true,
    showImages: true,
    articleLimit: 10,
    refreshInterval: 15,
    accentColor: '#7c3aed',
  },
  {
    id: 'bild',
    label: 'Bild',
    url: 'http://www.bild.de/rss-feeds/rss-16725492,feed=home.bild.html',
    enabled: true,
    showImages: true,
    articleLimit: 10,
    refreshInterval: 15,
    accentColor: '#dc2626',
  },
  {
    id: 'mydealz',
    label: 'MyDealz',
    url: 'https://www.mydealz.de/rss/deals',
    enabled: true,
    showImages: true,
    articleLimit: 10,
    refreshInterval: 15,
    accentColor: '#f97316',
  },
  {
    id: 'reddit-front-page',
    label: 'Reddit Front Page',
    url: 'https://www.reddit.com/.rss',
    enabled: true,
    showImages: true,
    articleLimit: 10,
    refreshInterval: 30,
    accentColor: '#ff4500',
  },
  {
    id: 'makezine',
    label: 'Makezine',
    url: 'https://makezine.com/feed/',
    enabled: true,
    showImages: true,
    articleLimit: 10,
    refreshInterval: 30,
    accentColor: '#0ea5e9',
  },
];

type PersistedFeedState = {
  feeds: FeedSource[];
  layout: GridLayout;
  settings: GlobalSettings;
  runtime: Record<string, FeedRuntime>;
  addFeed: (feed: Pick<FeedSource, 'label' | 'url'>) => FeedSource;
  updateFeed: (id: string, changes: Partial<Omit<FeedSource, 'id'>>) => void;
  deleteFeed: (id: string) => void;
  setLayout: (layout: GridLayout) => void;
  setFeedLoading: (id: string) => void;
  setFeedData: (id: string, data: FeedData) => void;
  setFeedError: (id: string, error: string) => void;
  updateSettings: (settings: Partial<GlobalSettings>) => void;
};

const initialLayout: GridLayout = defaultFeeds.map((feed, index) => ({
  i: feed.id,
  x: (index % 3) * 4,
  y: Math.floor(index / 3) * 8,
  w: 4,
  h: 10,
  minW: 2,
  minH: 5,
}));

export const useFeedStore = create<PersistedFeedState>()(
  persist(
    (set, get) => ({
      feeds: defaultFeeds,
      layout: initialLayout,
      settings: {
        theme: 'dark',
        density: 'comfortable',
        defaultArticleLimit: 10,
      },
      runtime: {},
      addFeed: (feed) => {
        const id = createFeedId(feed.label || feed.url);
        const source: FeedSource = {
          id,
          label: feed.label.trim() || hostnameLabel(feed.url),
          url: feed.url.trim(),
          enabled: true,
          showImages: true,
          articleLimit: get().settings.defaultArticleLimit,
          refreshInterval: 15,
          accentColor: '#7c3aed',
        };

        set((state) => ({
          feeds: [...state.feeds, source],
          layout: [
            ...state.layout,
            {
              i: source.id,
              x: (state.feeds.length % 3) * 4,
              y: Math.floor(state.feeds.length / 3) * 10,
              w: 4,
              h: 10,
              minW: 2,
              minH: 5,
            },
          ],
        }));

        return source;
      },
      updateFeed: (id, changes) => {
        set((state) => ({
          feeds: state.feeds.map((feed) => (feed.id === id ? { ...feed, ...changes } : feed)),
        }));
      },
      deleteFeed: (id) => {
        set((state) => {
          const runtime = { ...state.runtime };
          delete runtime[id];
          return {
            feeds: state.feeds.filter((feed) => feed.id !== id),
            layout: state.layout.filter((item) => item.i !== id),
            runtime,
          };
        });
      },
      setLayout: (layout) => {
        set({ layout });
      },
      setFeedLoading: (id) => {
        set((state) => ({
          runtime: {
            ...state.runtime,
            [id]: {
              ...state.runtime[id],
              loading: true,
              error: undefined,
              stale: Boolean(state.runtime[id]?.data),
            },
          },
        }));
      },
      setFeedData: (id, data) => {
        set((state) => ({
          runtime: {
            ...state.runtime,
            [id]: {
              data,
              loading: false,
              error: undefined,
              lastFetched: new Date().toISOString(),
              stale: false,
            },
          },
        }));
      },
      setFeedError: (id, error) => {
        set((state) => ({
          runtime: {
            ...state.runtime,
            [id]: {
              ...state.runtime[id],
              loading: false,
              error,
              stale: Boolean(state.runtime[id]?.data),
            },
          },
        }));
      },
      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },
    }),
    {
      name: 'feed-me-store',
      partialize: (state) => ({
        feeds: state.feeds,
        layout: state.layout,
        settings: state.settings,
        runtime: state.runtime,
      }),
    },
  ),
);

export function intervalToMs(interval: RefreshInterval): number | null {
  return interval === 'manual' ? null : interval * 60_000;
}

function createFeedId(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return `${base || 'feed'}-${crypto.randomUUID().slice(0, 8)}`;
}

function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'New Feed';
  }
}
