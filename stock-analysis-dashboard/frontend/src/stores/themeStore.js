import { create } from 'zustand';

const useThemeStore = create((set) => ({
  isDark: true,
  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      document.documentElement.classList.toggle('dark', next);
      return { isDark: next };
    }),
}));

export default useThemeStore;
