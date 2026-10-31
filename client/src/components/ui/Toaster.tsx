import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type ToastTone } from '@/store/toastStore';

const ICONS: Record<ToastTone, typeof Info> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};
const ICON_COLOR: Record<ToastTone, string> = {
  error: 'text-warning',
  success: 'text-success',
  info: 'text-accent-hover',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-[104px] right-6 z-50 flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 shadow-popover"
          >
            <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${ICON_COLOR[t.tone]}`} />
            <p className="flex-1 text-body text-text-primary">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="rounded-full text-text-secondary hover:text-text-primary"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
