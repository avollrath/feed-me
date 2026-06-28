import { useEffect, useState } from 'react';
import { GridLayout, useContainerWidth, type Layout } from 'react-grid-layout';
import { FeedCard } from './FeedCard';
import { useFeedStore } from '../store/feedStore';
import type { FeedSource } from '../types';

type FeedGridProps = {
  onRefreshFeed: (feed: FeedSource) => void;
};

export function FeedGrid({ onRefreshFeed }: FeedGridProps) {
  const feeds = useFeedStore((state) => state.feeds);
  const layout = useFeedStore((state) => state.layout);
  const setLayout = useFeedStore((state) => state.setLayout);
  const enabledFeeds = feeds.filter((feed) => feed.enabled);
  const [isMobile, setIsMobile] = useState(false);
  const { containerRef, mounted, width } = useContainerWidth({ initialWidth: 1280 });

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const activeLayout = enabledFeeds.map((feed, index) => {
    const saved = layout.find((item) => item.i === feed.id);
    if (isMobile) {
      return { i: feed.id, x: 0, y: index * 10, w: 1, h: saved?.h ?? 10, minW: 1, minH: 5 };
    }

    return normalizeLayoutItem(saved ?? { i: feed.id, x: (index % 3) * 4, y: Math.floor(index / 3) * 10, w: 4, h: 10 });
  });

  function handleLayoutChange(nextLayout: Layout[]) {
    if (!isMobile) {
      setLayout(nextLayout);
    }
  }

  return (
    <div ref={containerRef} className="mx-auto max-w-7xl px-2 py-4 md:px-4">
      {mounted ? (
        <GridLayout
          className="layout"
          width={width}
          layout={activeLayout}
          gridConfig={{ cols: isMobile ? 1 : 12, rowHeight: 56, margin: [16, 16], containerPadding: [0, 0] }}
          dragConfig={{ enabled: !isMobile, handle: '.feed-card-drag-handle', cancel: 'a,button,input,select,label,.feed-card-settings' }}
          resizeConfig={{ enabled: !isMobile, handles: ['s', 'e', 'se'] }}
          onLayoutChange={handleLayoutChange}
        >
          {enabledFeeds.map((feed) => (
            <div key={feed.id} className="h-full">
              <FeedCard feed={feed} columns={activeLayout.find((item) => item.i === feed.id)?.w ?? 4} onRefresh={onRefreshFeed} />
            </div>
          ))}
        </GridLayout>
      ) : null}
    </div>
  );
}

function normalizeLayoutItem(item: Layout): Layout {
  return {
    ...item,
    minW: item.minW ?? 2,
    minH: item.minH ?? 5,
  };
}
