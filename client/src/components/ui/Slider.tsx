import { useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/cn';

export interface SliderProps {
  value: number;
  max: number;
  step?: number;
  label: string;
  valueText?: string;
  variant?: 'accent' | 'neutral' | 'on-art';
  disabled?: boolean;
  className?: string;
  /** Called once the user finishes dragging (or on each keyboard step). */
  onCommit: (value: number) => void;
}

/** Native range input styled as the Figma seek/volume bar; commits on release, not on every move. */
export function Slider({
  value,
  max,
  step = 1,
  label,
  valueText,
  variant = 'accent',
  disabled,
  className,
  onCommit,
}: SliderProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const pointerDown = useRef(false);
  const shown = drag ?? value;
  const pct = max > 0 ? Math.min(100, (shown / max) * 100) : 0;

  const commit = (v: number) => {
    setDrag(null);
    onCommit(v);
  };

  return (
    <input
      type="range"
      min={0}
      max={max || 1}
      step={step}
      value={shown}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={valueText}
      data-variant={variant}
      className={cn('slider', className)}
      style={{ '--pct': `${pct}%` } as CSSProperties}
      onPointerDown={() => (pointerDown.current = true)}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (pointerDown.current) setDrag(v);
        else commit(v); // keyboard / assistive tech
      }}
      onPointerUp={(e) => {
        pointerDown.current = false;
        commit(Number((e.target as HTMLInputElement).value));
      }}
      onPointerCancel={() => {
        pointerDown.current = false;
        setDrag(null);
      }}
    />
  );
}
