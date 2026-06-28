import cors from 'cors';
import express from 'express';
import Parser from 'rss-parser';

type ParserItem = Parser.Item & {
  enclosure?: { url?: string; type?: string };
  'media:content'?: MediaValue;
  'media:thumbnail'?: MediaValue;
  content?: string;
  'content:encoded'?: string;
  summary?: string;
  creator?: string;
  author?: string;
  isoDate?: string;
};

type MediaValue = { $?: { url?: string }; url?: string } | Array<{ $?: { url?: string }; url?: string }>;

const app = express();
const port = 3001;
const parser = new Parser<Record<string, unknown>, ParserItem>({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'content:encoded', 'summary', 'creator'],
  },
});

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  }),
);

app.get('/api/feed', async (req, res) => {
  const url = parseFeedUrl(req.query.url);
  const limit = parseLimit(req.query.limit);

  if (!url) {
    res.status(400).json({ error: 'Valid url query parameter is required.' });
    return;
  }

  try {
    const feed = await parseFeed(url);
    const items = normalizeItems(feed.items, feed.link ?? url.origin, url);
    res.json({
      title: feed.title ?? url.hostname,
      description: stripHtml(feed.description ?? '').slice(0, 300),
      link: feed.link ?? url.origin,
      items: items.slice(0, limit).map((item) => ({
        title: item.title ?? 'Untitled article',
        link: item.link ?? feed.link ?? url.toString(),
        pubDate: normalizeDate(item.isoDate ?? item.pubDate),
        author: item.creator ?? item.author ?? null,
        image: extractImage(item),
        summary: stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? item['content:encoded'] ?? '').slice(0, 500),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown feed parsing error.';
    res.status(502).json({ error: message });
  }
});

app.get('/api/validate', async (req, res) => {
  const url = parseFeedUrl(req.query.url);

  if (!url) {
    res.json({ valid: false });
    return;
  }

  try {
    const feed = await parseFeed(url);
    res.json({ valid: Boolean(feed.title || feed.items.length) });
  } catch {
    res.json({ valid: false });
  }
});

app.listen(port, () => {
  console.log(`Feed Me proxy listening on http://localhost:${port}`);
});

function parseFeedUrl(value: unknown): URL | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function parseLimit(value: unknown): number {
  if (typeof value !== 'string') {
    return 10;
  }

  const limit = Number.parseInt(value, 10);
  return Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 10;
}

async function parseFeed(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'user-agent': 'FeedMeRSSReader/1.0 (+https://github.com/avollrath/feed-me)',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Feed responded with ${response.status}`);
    }

    return parser.parseString(await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function normalizeItems(items: ParserItem[], feedLink: string, feedUrl: URL): ParserItem[] {
  if (!isWikipediaOnThisDayFeed(feedUrl)) {
    return items;
  }

  const todaysItem = items.find((item) => isToday(item.isoDate ?? item.pubDate)) ?? items.at(-1);
  if (!todaysItem?.summary) {
    return todaysItem ? [todaysItem] : [];
  }

  const entries = extractWikipediaOnThisDayEntries(todaysItem.summary, todaysItem.link ?? feedLink, todaysItem.isoDate ?? todaysItem.pubDate);
  return entries.length ? entries : [todaysItem];
}

function isWikipediaOnThisDayFeed(url: URL): boolean {
  return url.hostname === 'de.wikipedia.org' && url.searchParams.get('feed') === 'onthisday';
}

function isToday(value?: string): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function extractWikipediaOnThisDayEntries(summary: string, fallbackLink: string, pubDate?: string): ParserItem[] {
  const html = decodeHtml(summary);
  const entries = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];

  return entries.map((entry, index) => {
    const entryHtml = entry[1] ?? '';
    const text = stripHtml(entryHtml);
    const year = text.match(/^(\d{3,4})\s*[\u2013-]\s*/)?.[1];
    const title = year ? `${year} - ${text.replace(/^\d{3,4}\s*[\u2013-]\s*/, '')}` : text;

    return {
      title: title.slice(0, 180),
      link: extractWikipediaLink(entryHtml) ?? fallbackLink,
      pubDate,
      isoDate: pubDate,
      author: 'Wikipedia',
      image: extractImageFromHtml(entryHtml),
      summary: text,
      guid: `${fallbackLink}#event-${index}`,
    };
  });
}

function extractImage(item: ParserItem): string | null {
  if (item.enclosure?.url && (!item.enclosure.type || item.enclosure.type.startsWith('image/'))) {
    return item.enclosure.url;
  }

  const mediaContent = getMediaUrl(item['media:content']);
  if (mediaContent) {
    return mediaContent;
  }

  const mediaThumbnail = getMediaUrl(item['media:thumbnail']);
  if (mediaThumbnail) {
    return mediaThumbnail;
  }

  const html = item.content ?? item['content:encoded'] ?? item.contentSnippet ?? '';
  const ogImage = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImage?.[1]) {
    return decodeHtml(ogImage[1]);
  }

  return extractImageFromHtml(html);
}

function extractImageFromHtml(html: string): string | null {
  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!img?.[1]) {
    return null;
  }

  return normalizeUrl(decodeHtml(img[1]), 'https://de.wikipedia.org');
}

function extractWikipediaLink(html: string): string | null {
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)];
  const link = links
    .map((match) => decodeHtml(match[1] ?? ''))
    .find((href) => href.startsWith('/wiki/') && !href.startsWith('/wiki/Datei:') && !/^\/wiki\/\d{3,4}$/.test(href));

  return link ? normalizeUrl(link, 'https://de.wikipedia.org') : null;
}

function normalizeUrl(value: string, base: string): string {
  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function getMediaUrl(value: MediaValue | undefined): string | null {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  for (const media of entries) {
    const url = media?.$?.url ?? media?.url;
    if (url) {
      return decodeHtml(url);
    }
  }

  return null;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
