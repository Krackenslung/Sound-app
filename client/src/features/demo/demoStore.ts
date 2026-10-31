import { create } from 'zustand';

const KEY = 'pulse.demo';

function read(): boolean {
  try {
    // Shareable entry point: /?demo=1 opens straight into demo mode.
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      sessionStorage.setItem(KEY, '1');
      return true;
    }
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function write(on: boolean) {
  try {
    if (on) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable (private mode): demo lasts for this page only */
  }
}

interface DemoState {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
}

/** Demo-mode flag. While on, the API layer serves fixtures and never touches the network. */
export const useDemoStore = create<DemoState>((set) => ({
  enabled: read(),
  setEnabled: (enabled) => {
    write(enabled);
    set({ enabled });
  },
}));

export const isDemo = () => useDemoStore.getState().enabled;
export const useDemo = () => useDemoStore((s) => s.enabled);
