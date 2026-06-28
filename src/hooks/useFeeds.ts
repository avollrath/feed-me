import { useCallback, useEffect, useMemo } from 'react';
import { intervalToMs, useFeedStore } from '../store/feedStore';
import type { FeedData, FeedSource } from '../types';

export function useFeeds() {
  const feeds = useFeedStore((state) => state.feeds);
  const setFeedLoading = useFeedStore((state) => state.setFeedLoading);
  const setFeedData = useFeedStore((state) => state.setFeedData);
  const setFeedError = useFeedStore((state) => state.setFeedError);
  const runtime = useFeedStore((state) => state.runtime);
  const enabledFeeds = useMemo(() => feeds.filter((feed) => feed.enabled), [feeds]);

  const refreshFeed = useCallback(
    async (feed: FeedSource) => {
      setFeedLoading(feed.id);

      try {
        const response = await fetch(`/api/feed?url=${encodeURIComponent(feed.url)}&limit=${feed.articleLimit}`);
        const payload = (await response.json()) as FeedData | { error?: string };

        if (!response.ok) {
          throw new Error('error' in payload && payload.error ? payload.error : 'Feed request failed.');
        }

        setFeedData(feed.id, payload as FeedData);
      } catch (error) {
        setFeedError(feed.id, error instanceof Error ? error.message : 'Feed request failed.');
      }
    },
    [setFeedData, setFeedError, setFeedLoading],
  );

  const refreshAll = useCallback(() => {
    void Promise.all(enabledFeeds.map((feed) => refreshFeed(feed)));
  }, [enabledFeeds, refreshFeed]);

  useEffect(() => {
    enabledFeeds.forEach((feed) => {
      if (!runtime[feed.id]) {
        void refreshFeed(feed);
      }
    });
  }, [enabledFeeds, refreshFeed, runtime]);

  useEffect(() => {
    const timers = enabledFeeds.flatMap((feed) => {
      const interval = intervalToMs(feed.refreshInterval);
      if (!interval) {
        return [];
      }

      return [window.setInterval(() => void refreshFeed(feed), interval)];
    });

    return () => timers.forEach((timer) => window.clearInterval(timer));
  }, [enabledFeeds, refreshFeed]);

  return { refreshFeed, refreshAll };
}
