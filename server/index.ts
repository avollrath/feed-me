import cors from 'cors';
import express from 'express';
import Parser from 'rss-parser';

type ParserItem = Parser.Item & {
  enclosure?: { url?: string; type?: string };
  'media:content'?: MediaValue;
  'media:thumbnail'?: MediaValue;
  content?: string;
  'content:encoded'?: string;
  creator?: string;
  author?: string;
  isoDate?: string;
};

type MediaValue = { $?: { url?: string }; url?: string } | Array<{ $?: { url?: string }; url?: string }>;

const app = express();
const port = 3001;
const parser = new Parser<Record<string, unknown>, ParserItem>({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'content:encoded', 'creator'],
  },
  timeout: 12000,
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
    const feed = await parser.parseURL(url.toString());
    res.json({
      title: feed.title ?? url.hostname,
      description: stripHtml(feed.description ?? '').slice(0, 300),
      link: feed.link ?? url.origin,
      items: feed.items.slice(0, limit).map((item) => ({
        title: item.title ?? 'Untitled article',
        link: item.link ?? feed.link ?? url.toString(),
        pubDate: normalizeDate(item.isoDate ?? item.pubDate),
        author: item.creator ?? item.author ?? null,
        image: extractImage(item),
        summary: stripHtml(item.contentSnippet ?? item.content ?? item['content:encoded'] ?? '').slice(0, 200),
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
    const feed = await parser.parseURL(url.toString());
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

function normalizeDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function extractImage(item: ParserItem): string | null {
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
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

  const html = item.content ?? item['content:encoded'] ?? '';
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImage?.[1]) {
    return ogImage[1];
  }

  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img?.[1] ?? null;
}

function getMediaUrl(value: MediaValue | undefined): string | null {
  const media = Array.isArray(value) ? value[0] : value;
  return media?.$?.url ?? media?.url ?? null;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
