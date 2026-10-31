import { create } from 'zustand';

interface UiState {
  devicePickerOpen: boolean;
  setDevicePickerOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  devicePickerOpen: false,
  setDevicePickerOpen: (devicePickerOpen) => set({ devicePickerOpen }),
}));
