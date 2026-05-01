import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Screen = 'auth' | 'generator' | 'loading' | 'results' | 'history';
export type Theme = 'light' | 'dark';
export type Accent = 'violet' | 'blue' | 'pink' | 'green' | 'amber';

export interface User {
  name: string;
  email: string;
}

export interface LiveThumbnail {
  thumbnailId: string;
  styleName: string;
  imagekitUrl: string;
  variants: Record<string, string>;
}

export interface HistoryEntry {
  jobId: string;
  prompt: string;
  style: string;
  aspect: string;
  count: number;
  createdAt: string;
  thumbnails: LiveThumbnail[];
}

interface AppState {
  // Persisted
  user: User | null;
  token: string | null;
  theme: Theme;
  accent: Accent;
  showBlobs: boolean;
  history: HistoryEntry[];

  // Session
  screen: Screen;
  headshotPreview: string | null;
  headshotUrl: string | null;
  prompt: string;
  styleSel: string;
  aspect: string;
  count: number;
  jobId: string | null;
  liveThumbnails: LiveThumbnail[];

  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  toggleTheme: () => void;
  setAccent: (accent: Accent) => void;
  setShowBlobs: (show: boolean) => void;
  setScreen: (screen: Screen) => void;
  setHeadshotPreview: (preview: string | null) => void;
  setHeadshotUrl: (url: string | null) => void;
  setPrompt: (prompt: string) => void;
  setStyleSel: (style: string) => void;
  setAspect: (aspect: string) => void;
  setCount: (count: number) => void;
  setJobId: (id: string | null) => void;
  addLiveThumbnail: (t: LiveThumbnail) => void;
  clearLiveThumbnails: () => void;
  saveJobToHistory: (entry: HistoryEntry) => void;
  startNewJob: () => void;
}

const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      theme: 'light',
      accent: 'violet',
      showBlobs: true,
      history: [],
      screen: 'auth',
      headshotPreview: null,
      headshotUrl: null,
      prompt: '',
      styleSel: 'clean_minimal',
      aspect: 'yt',
      count: 3,
      jobId: null,
      liveThumbnails: [],

      login: (user, token) => set({ user, token, screen: 'generator' }),
      logout: () => set({ user: null, token: null, screen: 'auth' }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setAccent: (accent) => set({ accent }),
      setShowBlobs: (showBlobs) => set({ showBlobs }),
      setScreen: (screen) => set({ screen }),
      setHeadshotPreview: (headshotPreview) => set({ headshotPreview }),
      setHeadshotUrl: (headshotUrl) => set({ headshotUrl }),
      setPrompt: (prompt) => set({ prompt }),
      setStyleSel: (styleSel) => set({ styleSel }),
      setAspect: (aspect) => set({ aspect }),
      setCount: (count) => set({ count }),
      setJobId: (jobId) => set({ jobId }),
      addLiveThumbnail: (t) => set((s) => ({ liveThumbnails: [...s.liveThumbnails, t] })),
      clearLiveThumbnails: () => set({ liveThumbnails: [] }),
      saveJobToHistory: (entry) =>
        set((s) => ({ history: [entry, ...s.history.slice(0, 49)] })),
      startNewJob: () =>
        set({ jobId: null, liveThumbnails: [], headshotPreview: null, headshotUrl: null, prompt: '', styleSel: 'clean_minimal', aspect: 'yt', count: 3 }),
    }),
    {
      name: 'hookframe-storage',
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        theme: s.theme,
        accent: s.accent,
        showBlobs: s.showBlobs,
        history: s.history,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user && state?.token) {
          state.screen = 'generator';
        }
      },
    }
  )
);

export default useAppStore;
