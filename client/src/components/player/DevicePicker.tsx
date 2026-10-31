import { useCallback, useId, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Speaker } from 'lucide-react';
import { playerApi } from '@/api/player';
import { toRows } from '@/features/player/deviceRows';
import { usePlayerControls } from '@/features/player/playerContext';
import { useDismiss } from '@/hooks/useDismiss';
import { cn } from '@/lib/cn';
import { usePlayerStore } from '@/store/playerStore';
import { useUiStore } from '@/store/uiStore';

function EqBars({ animate }: { animate: boolean }) {
  return (
    <span aria-hidden className="flex h-3.5 items-end gap-0.5">
      {[8, 14, 10].map((h, i) => (
        <span
          key={i}
          className={cn(
            'w-[3px] origin-bottom rounded-[1.5px] bg-accent-hover',
            animate && 'animate-eq',
          )}
          style={{ height: h, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

// Figma: Device picker popover (node 6:594), anchored to the PlayerBar devices icon.
export function DevicePicker() {
  const open = useUiStore((s) => s.devicePickerOpen);
  const setOpen = useUiStore((s) => s.setDevicePickerOpen);
  const localId = usePlayerStore((s) => s.deviceId);
  const activeDevice = usePlayerStore((s) => s.activeDevice);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const controls = usePlayerControls();
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(ref, open, close);

  const devices = useQuery({
    queryKey: ['player', 'devices'],
    queryFn: playerApi.devices,
    enabled: open,
    refetchInterval: open ? 5000 : false,
  });

  const rows = toRows(devices.data ?? [], localId, activeDevice?.id ?? null);
  const remoteActive = Boolean(activeDevice && !activeDevice.isLocal);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Connect to a device"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={activeDevice ? `Playing on ${activeDevice.name}` : 'Connect to a device'}
        onClick={() => setOpen(!open)}
        className={cn(
          'rounded-full transition-colors',
          open || remoteActive ? 'text-accent' : 'text-text-primary opacity-75 hover:opacity-100',
        )}
      >
        <Speaker aria-hidden className="size-5" strokeWidth={1.8} />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Connect to a device"
          className="absolute bottom-full right-0 z-40 mb-5 flex w-80 flex-col gap-1 rounded-[14px] border border-border bg-surface-2 p-3 shadow-popover"
        >
          <div className="flex flex-col gap-0.5 px-2 pb-2 pt-1">
            <p className="text-h3">Connect to a device</p>
            <p className="text-caption text-text-secondary">
              Playback moves instantly between devices.
            </p>
          </div>

          {devices.isPending && rows.length === 0 ? (
            <p className="px-2 py-3 text-caption text-text-secondary" role="status">
              Looking for devices…
            </p>
          ) : devices.isError && rows.length === 0 ? (
            <p className="px-2 py-3 text-caption text-text-secondary">
              Couldn&apos;t load your devices.
            </p>
          ) : rows.length === 0 ? (
            <p className="px-2 py-3 text-caption text-text-secondary">
              No devices found. Open Spotify on your phone or computer.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {rows.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      aria-current={row.active ? 'true' : undefined}
                      disabled={!controls.canControl}
                      onClick={() => {
                        if (!row.active) controls.transferTo(row.id);
                        close();
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition-colors disabled:cursor-not-allowed',
                        row.active ? 'bg-accent-soft' : 'hover:bg-surface-hover',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
                          row.active
                            ? 'bg-accent text-on-accent'
                            : 'bg-surface-hover text-text-primary',
                        )}
                      >
                        <Icon aria-hidden className="size-[18px]" strokeWidth={1.8} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={cn(
                            'truncate text-body font-semibold',
                            row.active ? 'text-accent-hover' : 'text-text-primary',
                          )}
                        >
                          {row.name}
                        </span>
                        <span className="truncate text-caption text-text-secondary">
                          {row.subtitle}
                        </span>
                      </span>
                      {row.active && <EqBars animate={isPlaying} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
