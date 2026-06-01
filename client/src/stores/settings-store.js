/**
 * 设置状态管理 (Zustand)
 * 持久化用户设置到 localStorage
 */

import { create } from 'zustand';

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  musicEnabled: true,
  cardSpeed: 'normal',   // slow | normal | fast
  fontSize: 'medium',    // small | medium | large
  resolution: 'auto',    // auto | 1080p | 1440p
};

// 从 localStorage 恢复设置
function loadSettings() {
  try {
    const saved = localStorage.getItem('poker_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

// 保存设置到 localStorage
function saveSettings(settings) {
  localStorage.setItem('poker_settings', JSON.stringify(settings));
}

export const useSettingsStore = create((set, get) => ({
  ...loadSettings(),

  toggleSound: () => {
    const newVal = !get().soundEnabled;
    set({ soundEnabled: newVal });
    saveSettings({ ...get() });
  },

  toggleMusic: () => {
    const newVal = !get().musicEnabled;
    set({ musicEnabled: newVal });
    saveSettings({ ...get() });
  },

  setCardSpeed: (speed) => {
    set({ cardSpeed: speed });
    saveSettings({ ...get() });
  },

  setFontSize: (size) => {
    set({ fontSize: size });
    saveSettings({ ...get() });
  },

  setResolution: (res) => {
    set({ resolution: res });
    saveSettings({ ...get() });
  },

  reset: () => {
    set({ ...DEFAULT_SETTINGS });
    saveSettings(DEFAULT_SETTINGS);
  },
}));
