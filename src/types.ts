import type { Layout } from 'react-grid-layout';

export type RefreshInterval = 5 | 15 | 30 | 60 | 'manual';
export type ThemeMode = 'dark' | 'light';
export type Density = 'compact' | 'comfortable';

export type FeedSource = {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  showImages: boolean;
  displayOptions: FeedDisplayOptions;
  articleLimit: number;
  refreshInterval: RefreshInterval;
  accentColor: string;
};

export type FeedDisplayOptions = {
  title: boolean;
  description: boolean;
  image: boolean;
  author: boolean;
  time: boolean;
  price: boolean;
};

export type FeedArticle = {
  title: string;
  link: string;
  pubDate: string | null;
  author: string | null;
  image: string | null;
  price: string | null;
  summary: string;
};

export type FeedData = {
  title: string;
  description: string;
  link: string;
  items: FeedArticle[];
};

export type FeedRuntime = {
  data?: FeedData;
  loading: boolean;
  error?: string;
  lastFetched?: string;
  stale: boolean;
};

export type GlobalSettings = {
  theme: ThemeMode;
  density: Density;
  defaultArticleLimit: number;
};

export type GridLayout = Layout[];
