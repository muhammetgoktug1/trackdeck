import { CheckCircle2, XCircle } from 'lucide-react';

export default function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl shadow-black/40 backdrop-blur animate-slide-up ${
            t.type === 'error'
              ? 'border-rose-500/30 bg-rose-950/80'
              : 'border-emerald-500/30 bg-emerald-950/80'
          }`}
        >
          {t.type === 'error' ? (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          )}
          <p className="text-sm font-medium leading-snug text-zinc-100">
            {t.message}
          </p>
        </div>
      ))}
    </div>
  );
}
