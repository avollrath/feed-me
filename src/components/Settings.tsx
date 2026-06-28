import { FormEvent, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useFeedStore } from '../store/feedStore';
import type { RefreshInterval } from '../types';

type SettingsProps = {
  open: boolean;
  onClose: () => void;
};

export function Settings({ open, onClose }: SettingsProps) {
  const feeds = useFeedStore((state) => state.feeds);
  const addFeed = useFeedStore((state) => state.addFeed);
  const updateFeed = useFeedStore((state) => state.updateFeed);
  const deleteFeed = useFeedStore((state) => state.deleteFeed);
  const settings = useFeedStore((state) => state.settings);
  const updateSettings = useFeedStore((state) => state.updateSettings);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: '', url: '' });

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      new URL(url);
      const response = await fetch(`/api/validate?url=${encodeURIComponent(url)}`);
      const result = (await response.json()) as { valid?: boolean };

      if (!result.valid) {
        setError('Feed URL did not validate.');
        return;
      }

      addFeed({ label, url });
      setLabel('');
      setUrl('');
    } catch {
      setError('Enter a valid RSS or Atom URL.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(feedId: string, currentLabel: string, currentUrl: string) {
    setEditingId(feedId);
    setDraft({ label: currentLabel, url: currentUrl });
  }

  function saveEdit(feedId: string) {
    if (!draft.url.trim()) {
      return;
    }

    updateFeed(feedId, { label: draft.label.trim(), url: draft.url.trim() });
    setEditingId(null);
  }

  return (
    <div className={open ? 'fixed inset-0 z-40 bg-black/60' : 'hidden'} onClick={onClose}>
      <aside className="ml-auto flex h-full w-full max-w-md flex-col border-l border-feed-border bg-feed-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-feed-border px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:text-white" aria-label="Close settings">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-sm font-semibold text-zinc-200">Feed Sources</h3>
            <div className="mt-3 space-y-3">
              {feeds.map((feed) => (
                <div key={feed.id} className="rounded-lg border border-feed-border p-3">
                  {editingId === feed.id ? (
                    <div className="space-y-2">
                      <input value={draft.label} onChange={(event) => setDraft((value) => ({ ...value, label: event.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
                      <input value={draft.url} onChange={(event) => setDraft((value) => ({ ...value, url: event.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingId(null)} className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-700 px-2 text-xs text-zinc-300">
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                        <button type="button" onClick={() => saveEdit(feed.id)} className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-600 px-2 text-xs font-medium text-white">
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <label className="mt-1 inline-flex cursor-pointer items-center">
                        <input type="checkbox" checked={feed.enabled} onChange={(event) => updateFeed(feed.id, { enabled: event.target.checked })} className="h-4 w-4 accent-violet-600" />
                      </label>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{feed.label}</div>
                        <div className="mt-1 truncate text-xs text-zinc-500">{feed.url}</div>
                      </div>
                      <button type="button" onClick={() => setExpandedId(expandedId === feed.id ? null : feed.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:text-white" aria-label={`Options for ${feed.label}`}>
                        <ChevronDown className={expandedId === feed.id ? 'h-3.5 w-3.5 rotate-180' : 'h-3.5 w-3.5'} />
                      </button>
                      <button type="button" onClick={() => startEdit(feed.id, feed.label, feed.url)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:text-white" aria-label={`Edit ${feed.label}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => deleteFeed(feed.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10" aria-label={`Delete ${feed.label}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {expandedId === feed.id && editingId !== feed.id ? (
                    <div className="mt-4 grid gap-3 border-t border-feed-border pt-3 text-sm">
                      <label className="flex items-center justify-between gap-3 text-zinc-300">
                        <span>Show images</span>
                        <input type="checkbox" checked={feed.showImages} onChange={(event) => updateFeed(feed.id, { showImages: event.target.checked })} className="h-4 w-4 accent-violet-600" />
                      </label>
                      <label className="grid gap-1 text-zinc-300">
                        <span>Articles per source</span>
                        <input type="number" min={1} max={50} value={feed.articleLimit} onChange={(event) => updateFeed(feed.id, { articleLimit: clampNumber(event.target.value, 1, 50) })} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
                      </label>
                      <label className="grid gap-1 text-zinc-300">
                        <span>Refresh interval</span>
                        <select value={feed.refreshInterval} onChange={(event) => updateFeed(feed.id, { refreshInterval: parseInterval(event.target.value) })} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500">
                          <option value="5">5min</option>
                          <option value="15">15min</option>
                          <option value="30">30min</option>
                          <option value="60">1hr</option>
                          <option value="manual">manual</option>
                        </select>
                      </label>
                      <label className="flex items-center justify-between gap-3 text-zinc-300">
                        <span>Card accent</span>
                        <input type="color" value={feed.accentColor} onChange={(event) => updateFeed(feed.id, { accentColor: event.target.value })} className="h-8 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-950" />
                      </label>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-200">Add Feed</h3>
            <form onSubmit={handleAdd} className="mt-3 space-y-3">
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/feed.xml" className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500" />
              <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Custom label" className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500" />
              {error ? <p className="text-xs text-red-300">{error}</p> : null}
              <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-violet-600 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                <Plus className="h-4 w-4" />
                {saving ? 'Validating...' : 'Add'}
              </button>
            </form>
          </section>

          <section className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-200">Global Settings</h3>
            <div className="mt-3 space-y-3 rounded-lg border border-feed-border p-3 text-sm">
              <label className="flex items-center justify-between gap-3 text-zinc-300">
                <span>Light mode</span>
                <input type="checkbox" checked={settings.theme === 'light'} onChange={(event) => updateSettings({ theme: event.target.checked ? 'light' : 'dark' })} className="h-4 w-4 accent-violet-600" />
              </label>
              <label className="grid gap-1 text-zinc-300">
                <span>Density</span>
                <select value={settings.density} onChange={(event) => updateSettings({ density: event.target.value === 'compact' ? 'compact' : 'comfortable' })} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500">
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
              <label className="grid gap-1 text-zinc-300">
                <span>Default articles per source</span>
                <input type="number" min={1} max={50} value={settings.defaultArticleLimit} onChange={(event) => updateSettings({ defaultArticleLimit: clampNumber(event.target.value, 1, 50) })} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
              </label>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function clampNumber(value: string, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.min(Math.max(parsed, min), max);
}

function parseInterval(value: string): RefreshInterval {
  if (value === 'manual') {
    return 'manual';
  }

  const parsed = Number.parseInt(value, 10);
  return parsed === 5 || parsed === 15 || parsed === 30 || parsed === 60 ? parsed : 15;
}
