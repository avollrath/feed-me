import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { FeedCard } from './FeedCard';
import { useFeedStore } from '../store/feedStore';
import type { FeedSource, GridLayout } from '../types';

type FeedGridProps = {
  onRefreshFeed: (feed: FeedSource) => void;
};

type Interaction =
  | {
      type: 'drag';
      id: string;
      startX: number;
      startY: number;
      origin: GridLayout[number];
    }
  | {
      type: 'resize';
      id: string;
      direction: 'e' | 's' | 'se';
      startX: number;
      startY: number;
      origin: GridLayout[number];
    };

const rowHeight = 56;
const gap = 16;

export function FeedGrid({ onRefreshFeed }: FeedGridProps) {
  const feeds = useFeedStore((state) => state.feeds);
  const layout = useFeedStore((state) => state.layout);
  const setLayout = useFeedStore((state) => state.setLayout);
  const enabledFeeds = feeds.filter((feed) => feed.enabled);
  const [isMobile, setIsMobile] = useState(false);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const width = useElementWidth(containerRef);
  const cols = isMobile ? 1 : 12;

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const activeLayout = useMemo(() => enabledFeeds.map((feed, index) => {
    const saved = layout.find((item) => item.i === feed.id);
    if (isMobile) {
      return { i: feed.id, x: 0, y: index * 10, w: 1, h: saved?.h ?? 10, minW: 1, minH: 5 };
    }

    return normalizeLayoutItem(saved ?? { i: feed.id, x: (index % 3) * 4, y: Math.floor(index / 3) * 10, w: 4, h: 10 });
  }), [enabledFeeds, isMobile, layout]);

  const measuredWidth = Math.max(width, 320);
  const colWidth = cols > 0 ? (measuredWidth - gap * (cols - 1)) / cols : 0;
  const containerHeight = activeLayout.reduce((height, item) => Math.max(height, item.y * (rowHeight + gap) + item.h * rowHeight + Math.max(0, item.h - 1) * gap), 0);

  useEffect(() => {
    if (!interaction) {
      return undefined;
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      const columnDelta = Math.round((event.clientX - interaction.startX) / (colWidth + gap));
      const rowDelta = Math.round((event.clientY - interaction.startY) / (rowHeight + gap));
      const origin = interaction.origin;
      const nextItem =
        interaction.type === 'drag'
          ? {
              ...origin,
              x: clamp(origin.x + columnDelta, 0, cols - origin.w),
              y: Math.max(0, origin.y + rowDelta),
            }
          : {
              ...origin,
              w: interaction.direction.includes('e') ? clamp(origin.w + columnDelta, origin.minW ?? 2, cols - origin.x) : origin.w,
              h: interaction.direction.includes('s') ? Math.max(origin.minH ?? 5, origin.h + rowDelta) : origin.h,
            };

      setLayout(activeLayout.map((item) => (item.i === interaction.id ? nextItem : item)));
    }

    function handlePointerUp() {
      setInteraction(null);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeLayout, colWidth, cols, interaction, setLayout]);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (isMobile || event.button !== 0 || isInteractiveTarget(event.target)) {
      return;
    }

    const item = activeLayout.find((candidate) => candidate.i === id);
    if (!item) {
      return;
    }

    event.preventDefault();
    setInteraction({ type: 'drag', id, startX: event.clientX, startY: event.clientY, origin: item });
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>, id: string, direction: 'e' | 's' | 'se') {
    if (isMobile || event.button !== 0) {
      return;
    }

    const item = activeLayout.find((candidate) => candidate.i === id);
    if (!item) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setInteraction({ type: 'resize', id, direction, startX: event.clientX, startY: event.clientY, origin: item });
  }

  return (
    <div ref={containerRef} className={interaction ? 'mx-auto max-w-7xl select-none px-2 py-4 md:px-4' : 'mx-auto max-w-7xl px-2 py-4 md:px-4'}>
      <div className="relative" style={{ height: isMobile ? undefined : containerHeight }}>
        {enabledFeeds.map((feed) => {
          const item = activeLayout.find((candidate) => candidate.i === feed.id);
          if (!item) {
            return null;
          }

          const style = isMobile
            ? undefined
            : {
                left: item.x * (colWidth + gap),
                top: item.y * (rowHeight + gap),
                width: item.w * colWidth + Math.max(0, item.w - 1) * gap,
                height: item.h * rowHeight + Math.max(0, item.h - 1) * gap,
              };

          return (
            <div key={feed.id} className={isMobile ? 'mb-4 h-[704px]' : 'absolute transition-shadow'} style={style} onPointerDown={(event) => startDrag(event, feed.id)}>
              <FeedCard feed={feed} columns={item.w} onRefresh={onRefreshFeed} />
              {!isMobile ? (
                <>
                  <button type="button" className="feed-card-resize-handle feed-card-resize-e" aria-label={`Resize ${feed.label} wider`} onPointerDown={(event) => startResize(event, feed.id, 'e')} />
                  <button type="button" className="feed-card-resize-handle feed-card-resize-s" aria-label={`Resize ${feed.label} taller`} onPointerDown={(event) => startResize(event, feed.id, 's')} />
                  <button type="button" className="feed-card-resize-handle feed-card-resize-se" aria-label={`Resize ${feed.label}`} onPointerDown={(event) => startResize(event, feed.id, 'se')} />
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizeLayoutItem(item: GridLayout[number]): GridLayout[number] {
  return {
    ...item,
    minW: item.minW ?? 2,
    minH: item.minH ?? 5,
  };
}

function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }

    const element = ref.current;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

function isInteractiveTarget(target: EventTarget): boolean {
  return target instanceof Element && Boolean(target.closest('a,button,input,select,label,.feed-card-settings,.feed-card-resize-handle'));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
