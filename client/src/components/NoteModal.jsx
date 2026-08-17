import { useEffect, useRef, useState } from 'react';
import { X, Loader2, Plus, Trash2, Link2, Paperclip, FileUp } from 'lucide-react';
import { formatFileSize } from '../lib/format.js';
import { api } from '../lib/api.js';

const EMPTY_FORM = { title: '', content: '', pinned: false, links: [] };

const inputClass =
  'w-full rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20';

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500';

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function NoteModal({ open, note, saving, error, onSave, onClose, onAttachmentDeleted }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [linkError, setLinkError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(
        note
          ? {
              title: note.title,
              content: note.content ?? '',
              pinned: note.pinned ?? false,
              links: (note.links ?? []).map((l) => ({ url: l.url, label: l.label ?? '' })),
            }
          : EMPTY_FORM
      );
      setLinkError('');
      setAttachments(note?.attachments ?? []);
      setPendingFiles([]);
    }
  }, [open, note]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const setLink = (index, field, value) => {
    setForm((f) => {
      const links = [...f.links];
      links[index] = { ...links[index], [field]: value };
      return { ...f, links };
    });
    setLinkError('');
  };

  const addLink = () => {
    setForm((f) => ({ ...f, links: [...f.links, { url: '', label: '' }] }));
  };

  const removeLink = (index) => {
    setForm((f) => ({ ...f, links: f.links.filter((_, i) => i !== index) }));
  };

  const removeAttachment = async (att) => {
    try {
      await api.deleteNoteAttachment(note.id, att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      onAttachmentDeleted?.();
    } catch (err) {
      setLinkError(err.message);
    }
  };

  const pickFiles = (e) => {
    const files = [...e.target.files];
    if (files.length) setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const submit = (e) => {
    e.preventDefault();
    // istemci tarafı hızlı kontrol; sunucu da doğrular
    for (const l of form.links) {
      if (l.url && !isValidHttpUrl(l.url)) {
        setLinkError('Bağlantı adresi geçerli bir http(s) olmalı');
        return;
      }
    }
    onSave(
      {
        ...form,
        title: form.title.trim(),
        content: form.content.trim(),
        links: form.links.filter((l) => l.url.trim() !== ''),
      },
      pendingFiles
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 animate-pop-in">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-[15px] font-bold text-white">
            {note ? 'Notu Düzenle' : 'Yeni Not'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <div>
            <label className={labelClass} htmlFor="n-title">
              Başlık
            </label>
            <input
              id="n-title"
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Örn: Faydalı GitHub repoları"
              required
              maxLength={200}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="n-content">
              İçerik
            </label>
            <textarea
              id="n-content"
              className={`${inputClass} min-h-[120px] resize-y leading-relaxed`}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Açıklamalar, hatırlatmalar, komutlar..."
              maxLength={20000}
            />
          </div>

          {/* Bağlantılar */}
          <div>
            <p className={labelClass}>Bağlantılar <span className="font-normal normal-case text-zinc-600">(repo, sayfa, döküman...)</span></p>
            <div className="flex flex-col gap-2">
              {form.links.length > 0 && (
                <div className="flex items-center gap-2 px-1 pb-0.5">
                  <span className="w-2/5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Etiket <span className="font-normal normal-case">(opsiyonel)</span>
                  </span>
                  <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Adres
                  </span>
                  <span className="w-9 shrink-0" />
                </div>
              )}
              {form.links.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={`${inputClass} w-2/5`}
                    value={l.label}
                    onChange={(e) => setLink(i, 'label', e.target.value)}
                    placeholder="Etiket (örn: kurulum rehberi)"
                    maxLength={200}
                  />
                  <input
                    className={`${inputClass} flex-1`}
                    value={l.url}
                    onChange={(e) => setLink(i, 'url', e.target.value)}
                    placeholder="https://..."
                    maxLength={2048}
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    title="Bağlantıyı kaldır"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addLink}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Bağlantı Ekle
              </button>
              {linkError && (
                <p className="text-xs font-medium text-rose-400">{linkError}</p>
              )}
            </div>
          </div>

          {/* Dosyalar */}
          <div>
            <p className={labelClass}>Dosyalar <span className="font-normal normal-case text-zinc-600">(pdf, docx, görsel — en fazla 25MB)</span></p>

            {note && attachments.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-800/30 px-3 py-2"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-300">
                      {att.fileName}
                    </span>
                    <span className="shrink-0 text-[11px] text-zinc-600">
                      {formatFileSize(att.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      title="Eki sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {pendingFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-3 py-2"
                  >
                    <FileUp className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-300">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-zinc-600">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      title="Listeden çıkar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Dosya Seç
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={pickFiles}
              className="hidden"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3">
            <span className="text-sm font-medium text-zinc-300">
              Listeye sabitle
              <span className="mt-0.5 block text-xs font-normal text-zinc-600">
                Sabitlenen notlar listenin başında durur
              </span>
            </span>
            <span className="relative inline-block shrink-0">
              <input
                type="checkbox"
                className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-zinc-700 transition-colors checked:bg-amber-500"
                checked={form.pinned}
                onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
              />
              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </span>
          </label>

          {error && (
            <p className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-400 ring-1 ring-rose-500/20">
              {error}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {note ? 'Kaydet' : 'Notu Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
