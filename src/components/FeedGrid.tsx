import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { FeedCard } from './FeedCard';
import { useFeedStore } from '../store/feedStore';
import type { FeedSource, GridLayout } from '../types';

type FeedGridProps = {
  onRefreshFeed: (feed: FeedSource) => void;
};

type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type Interaction =
  | {
      type: 'drag';
      id: string;
      startX: number;
      startY: number;
      origin: GridLayout[number];
      startLayout: GridLayout;
    }
  | {
      type: 'resize';
      id: string;
      direction: ResizeDirection;
      startX: number;
      startY: number;
      origin: GridLayout[number];
      startLayout: GridLayout;
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

  const baseLayout = useMemo(() => enabledFeeds.map((feed, index) => {
    const saved = layout.find((item) => item.i === feed.id);
    if (isMobile) {
      return { i: feed.id, x: 0, y: index * 10, w: 1, h: saved?.h ?? 10, minW: 1, minH: 5 };
    }

    return normalizeLayoutItem(saved ?? { i: feed.id, x: (index % 3) * 4, y: Math.floor(index / 3) * 10, w: 4, h: 10 });
  }), [enabledFeeds, isMobile, layout]);
  const activeLayout = useMemo(() => (isMobile ? baseLayout : arrangeLayout(baseLayout)), [baseLayout, isMobile]);

  const measuredWidth = Math.max(width, 320);
  const colWidth = cols > 0 ? (measuredWidth - gap * (cols - 1)) / cols : 0;
  const containerHeight = activeLayout.reduce((height, item) => Math.max(height, item.y * (rowHeight + gap) + item.h * rowHeight + Math.max(0, item.h - 1) * gap), 0);

  useEffect(() => {
    if (!isMobile && !interaction && !layoutsEqual(baseLayout, activeLayout)) {
      setLayout(activeLayout);
    }
  }, [activeLayout, baseLayout, interaction, isMobile, setLayout]);

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
          ? fitDraggedItem(
              {
                ...origin,
                x: clamp(origin.x + columnDelta, 0, cols - origin.w),
                y: Math.max(0, origin.y + rowDelta),
              },
              interaction.startLayout.filter((item) => item.i !== interaction.id),
              cols,
            )
          : resizeItem(origin, interaction.direction, columnDelta, rowDelta, cols);

      const nextLayout =
        interaction.type === 'drag'
          ? arrangeLayout(resolveDragSwitch(interaction.startLayout, nextItem, origin), interaction.id)
          : arrangeLayout(interaction.startLayout.map((item) => (item.i === interaction.id ? nextItem : item)), interaction.id);

      setLayout(nextLayout);
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
  }, [colWidth, cols, interaction, setLayout]);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (isMobile || event.button !== 0 || isInteractiveTarget(event.target)) {
      return;
    }

    const item = activeLayout.find((candidate) => candidate.i === id);
    if (!item) {
      return;
    }

    event.preventDefault();
    setInteraction({ type: 'drag', id, startX: event.clientX, startY: event.clientY, origin: item, startLayout: activeLayout });
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>, id: string, direction: ResizeDirection) {
    if (isMobile || event.button !== 0) {
      return;
    }

    const item = activeLayout.find((candidate) => candidate.i === id);
    if (!item) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setInteraction({ type: 'resize', id, direction, startX: event.clientX, startY: event.clientY, origin: item, startLayout: activeLayout });
  }

  return (
    <div ref={containerRef} className={interaction ? 'w-full select-none px-3 py-4 md:px-6 xl:px-8' : 'w-full px-3 py-4 md:px-6 xl:px-8'}>
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
            <div
              key={feed.id}
              className={isMobile ? 'mb-4 h-[704px]' : 'absolute transition-[left,top,width,height,box-shadow] duration-200 ease-out'}
              style={style}
              onPointerDown={(event) => startDrag(event, feed.id)}
            >
              <FeedCard feed={feed} columns={item.w} onRefresh={onRefreshFeed} />
              {!isMobile ? (
                <>
                  <button type="button" className="feed-card-resize-handle feed-card-resize-n" aria-label={`Resize ${feed.label} upward`} onPointerDown={(event) => startResize(event, feed.id, 'n')} />
                  <button type="button" className="feed-card-resize-handle feed-card-resize-e" aria-label={`Resize ${feed.label} wider`} onPointerDown={(event) => startResize(event, feed.id, 'e')} />
                  <button type="button" className="feed-card-resize-handle feed-card-resize-s" aria-label={`Resize ${feed.label} taller`} onPointerDown={(event) => startResize(event, feed.id, 's')} />
                  <button type="button" className="feed-card-resize-handle feed-card-resize-w" aria-label={`Resize ${feed.label} narrower`} onPointerDown={(event) => startResize(event, feed.id, 'w')} />
                  <button type="button" className="feed-card-resize-handle feed-card-resize-ne" aria-label={`Resize ${feed.label}`} onPointerDown={(event) => startResize(event, feed.id, 'ne')} />
                  <button type="button" className="feed-card-resize-handle feed-card-resize-nw" aria-label={`Resize ${feed.label}`} onPointerDown={(event) => startResize(event, feed.id, 'nw')} />
                  <button type="button" className="feed-card-resize-handle feed-card-resize-se" aria-label={`Resize ${feed.label}`} onPointerDown={(event) => startResize(event, feed.id, 'se')} />
                  <button type="button" className="feed-card-resize-handle feed-card-resize-sw" aria-label={`Resize ${feed.label}`} onPointerDown={(event) => startResize(event, feed.id, 'sw')} />
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
  const width = clamp(item.w, item.minW ?? 2, 12);

  return {
    ...item,
    x: clamp(item.x, 0, 12 - width),
    w: width,
    y: Math.max(0, item.y),
    minW: item.minW ?? 2,
    minH: item.minH ?? 5,
  };
}

function arrangeLayout(layout: GridLayout, priorityId?: string): GridLayout {
  const priorityItem = priorityId ? layout.find((item) => item.i === priorityId) : undefined;
  const items = [
    ...(priorityItem ? [priorityItem] : []),
    ...layout
      .filter((item) => item.i !== priorityId)
      .sort((first, second) => first.y - second.y || first.x - second.x),
  ].map((item) => ({ ...item }));
  const placed: GridLayout = [];

  for (const item of items) {
    while (placed.some((placedItem) => overlaps(item, placedItem))) {
      item.y += 1;
    }

    placed.push(item);
  }

  return layout.map((item) => placed.find((placedItem) => placedItem.i === item.i) ?? item);
}

function fitDraggedItem(item: GridLayout[number], others: GridLayout, cols: number): GridLayout[number] {
  let fitted = { ...item };

  while (fitted.w > (fitted.minW ?? 2) && others.some((other) => overlaps(fitted, other))) {
    fitted = { ...fitted, w: fitted.w - 1 };
    fitted.x = clamp(fitted.x, 0, cols - fitted.w);
  }

  return fitted;
}

function resizeItem(item: GridLayout[number], direction: ResizeDirection, columnDelta: number, rowDelta: number, cols: number): GridLayout[number] {
  const minW = item.minW ?? 2;
  const minH = item.minH ?? 5;
  let { x, y, w, h } = item;

  if (direction.includes('e')) {
    w = clamp(item.w + columnDelta, minW, cols - item.x);
  }

  if (direction.includes('s')) {
    h = Math.max(minH, item.h + rowDelta);
  }

  if (direction.includes('w')) {
    const maxX = item.x + item.w - minW;
    x = clamp(item.x + columnDelta, 0, maxX);
    w = item.w + item.x - x;
  }

  if (direction.includes('n')) {
    const maxY = item.y + item.h - minH;
    y = clamp(item.y + rowDelta, 0, maxY);
    h = item.h + item.y - y;
  }

  return { ...item, x, y, w, h };
}

function resolveDragSwitch(layout: GridLayout, draggedItem: GridLayout[number], origin: GridLayout[number]): GridLayout {
  const target = layout
    .filter((item) => item.i !== draggedItem.i)
    .map((item) => ({ item, area: overlapArea(draggedItem, item) }))
    .filter(({ area }) => area > 0)
    .sort((first, second) => second.area - first.area)[0]?.item;

  return layout.map((item) => {
    if (item.i === draggedItem.i) {
      return draggedItem;
    }

    if (target && item.i === target.i) {
      return { ...item, x: origin.x, y: origin.y };
    }

    return item;
  });
}

function overlaps(first: GridLayout[number], second: GridLayout[number]): boolean {
  return first.x < second.x + second.w && first.x + first.w > second.x && first.y < second.y + second.h && first.y + first.h > second.y;
}

function overlapArea(first: GridLayout[number], second: GridLayout[number]): number {
  const width = Math.min(first.x + first.w, second.x + second.w) - Math.max(first.x, second.x);
  const height = Math.min(first.y + first.h, second.y + second.h) - Math.max(first.y, second.y);
  return width > 0 && height > 0 ? width * height : 0;
}

function layoutsEqual(first: GridLayout, second: GridLayout): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((item) => {
    const other = second.find((candidate) => candidate.i === item.i);
    return Boolean(other && item.x === other.x && item.y === other.y && item.w === other.w && item.h === other.h);
  });
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
