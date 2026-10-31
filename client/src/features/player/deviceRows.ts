import {
  Car,
  Gamepad2,
  Laptop,
  Monitor,
  Smartphone,
  Speaker,
  Tablet,
  Tv,
  type LucideIcon,
} from 'lucide-react';
import type { Device } from '@/api/types';

const DEVICE_ICONS: Record<string, LucideIcon> = {
  computer: Laptop,
  smartphone: Smartphone,
  tablet: Tablet,
  speaker: Speaker,
  tv: Tv,
  castvideo: Tv,
  gameconsole: Gamepad2,
  automobile: Car,
};

const DEVICE_LABELS: Record<string, string> = {
  computer: 'Computer',
  smartphone: 'Phone',
  tablet: 'Tablet',
  speaker: 'Speaker',
  tv: 'TV',
  castvideo: 'Cast device',
  castaudio: 'Cast speaker',
  gameconsole: 'Game console',
  automobile: 'Car',
};

export interface Row {
  id: string;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  active: boolean;
}

export function toRows(devices: Device[], localId: string | null, activeId: string | null): Row[] {
  const rows: Row[] = [];
  const seen = new Set<string>();
  const add = (d: Device, local: boolean) => {
    if (!d.id || seen.has(d.id)) return;
    seen.add(d.id);
    const active = d.isActive || d.id === activeId;
    const type = d.type.toLowerCase();
    rows.push({
      id: d.id,
      name: local ? 'This browser' : d.name,
      subtitle: [local ? 'Pulse Player' : (DEVICE_LABELS[type] ?? d.type), active && 'Listening']
        .filter(Boolean)
        .join(' · '),
      icon: local ? Laptop : (DEVICE_ICONS[type] ?? Monitor),
      active,
    });
  };
  // This browser first, even if Spotify hasn't listed it yet.
  if (localId) {
    add(
      devices.find((d) => d.id === localId) ?? {
        id: localId,
        name: 'This browser',
        type: 'Computer',
        isActive: false,
        volumePercent: null,
      },
      true,
    );
  }
  devices.forEach((d) => add(d, false));
  return rows;
}
