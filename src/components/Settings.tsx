import { FormEvent, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useFeedStore } from '../store/feedStore';

type SettingsProps = {
  open: boolean;
  onClose: () => void;
};

export function Settings({ open, onClose }: SettingsProps) {
  const feeds = useFeedStore((state) => state.feeds);
  const addFeed = useFeedStore((state) => state.addFeed);
  const updateFeed = useFeedStore((state) => state.updateFeed);
  const deleteFeed = useFeedStore((state) => state.deleteFeed);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
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
                      <button type="button" onClick={() => startEdit(feed.id, feed.label, feed.url)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:text-white" aria-label={`Edit ${feed.label}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => deleteFeed(feed.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10" aria-label={`Delete ${feed.label}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
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
        </div>
      </aside>
    </div>
  );
}
