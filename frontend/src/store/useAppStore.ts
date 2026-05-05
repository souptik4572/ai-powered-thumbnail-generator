import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BackendJob, BackendThumbnail } from '../api';

export type GenerateView = 'form' | 'loading' | 'results';
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
  generateView: GenerateView;
  headshotPreview: string | null;
  headshotUrl: string | null;
  prompt: string;
  styleSel: string;
  aspect: string;
  count: number;
  jobId: string | null;
  liveThumbnails: LiveThumbnail[];
  credits: number | null;
  jobError: string | null;
  selectedJob: BackendJob | null;
  selectedThumbnail: BackendThumbnail | null;

  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setCredits: (credits: number | null) => void;
  toggleTheme: () => void;
  setAccent: (accent: Accent) => void;
  setShowBlobs: (show: boolean) => void;
  setGenerateView: (view: GenerateView) => void;
  setHeadshotPreview: (preview: string | null) => void;
  setHeadshotUrl: (url: string | null) => void;
  setPrompt: (prompt: string) => void;
  setStyleSel: (style: string) => void;
  setAspect: (aspect: string) => void;
  setCount: (count: number) => void;
  setJobId: (id: string | null) => void;
  addLiveThumbnail: (t: LiveThumbnail) => void;
  clearLiveThumbnails: () => void;
  setJobError: (error: string | null) => void;
  saveJobToHistory: (entry: HistoryEntry) => void;
  startNewJob: () => void;
  setSelectedJob: (job: BackendJob | null) => void;
  setSelectedThumbnail: (thumbnail: BackendThumbnail | null) => void;
  removeThumbnailFromSelectedJob: (thumbnailId: string) => void;
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
      generateView: 'form',
      headshotPreview: null,
      headshotUrl: null,
      prompt: '',
      styleSel: 'clean_minimal',
      aspect: 'yt',
      count: 3,
      jobId: null,
      liveThumbnails: [],
      credits: null,
      jobError: null,
      selectedJob: null,
      selectedThumbnail: null,

      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, credits: null }),
      setCredits: (credits) => set({ credits }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setAccent: (accent) => set({ accent }),
      setShowBlobs: (showBlobs) => set({ showBlobs }),
      setGenerateView: (generateView) => set({ generateView }),
      setHeadshotPreview: (headshotPreview) => set({ headshotPreview }),
      setHeadshotUrl: (headshotUrl) => set({ headshotUrl }),
      setPrompt: (prompt) => set({ prompt }),
      setStyleSel: (styleSel) => set({ styleSel }),
      setAspect: (aspect) => set({ aspect }),
      setCount: (count) => set({ count }),
      setJobId: (jobId) => set({ jobId }),
      addLiveThumbnail: (t) => set((s) => ({
        liveThumbnails: s.liveThumbnails.some((x) => x.thumbnailId === t.thumbnailId)
          ? s.liveThumbnails
          : [...s.liveThumbnails, t],
      })),
      clearLiveThumbnails: () => set({ liveThumbnails: [] }),
      setJobError: (jobError) => set({ jobError }),
      saveJobToHistory: (entry) =>
        set((s) => ({ history: [entry, ...s.history.slice(0, 49)] })),
      startNewJob: () =>
        set({ jobId: null, liveThumbnails: [], jobError: null, headshotPreview: null, headshotUrl: null, prompt: '', styleSel: 'clean_minimal', aspect: 'yt', count: 3, generateView: 'form' }),
      setSelectedJob: (selectedJob) => set({ selectedJob }),
      setSelectedThumbnail: (selectedThumbnail) => set({ selectedThumbnail }),
      removeThumbnailFromSelectedJob: (thumbnailId) =>
        set((s) => ({
          selectedJob: s.selectedJob
            ? { ...s.selectedJob, thumbnails: s.selectedJob.thumbnails.filter((t) => t.id !== thumbnailId) }
            : null,
        })),
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
    }
  )
);

export default useAppStore;
