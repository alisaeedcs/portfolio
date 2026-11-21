import { create } from 'zustand'

interface State {
  section: string
  energy: number // 0 calm .. 1 wild
  experienceOpen: number | null // which experience row is expanded
  projectOpen: number | null // which project row is expanded
  menuOpen: boolean // is the name menu open right now (the home-page guide waits while it is)
  setSection: (s: string) => void
  setEnergy: (e: number) => void
  setExperienceOpen: (i: number | null) => void
  setProjectOpen: (i: number | null) => void
  setMenuOpen: (open: boolean) => void
}

export const useStore = create<State>((set) => ({
  section: 'hero',
  energy: 0,
  experienceOpen: null,
  projectOpen: null,
  menuOpen: false,
  setSection: (section) => set({ section, experienceOpen: null, projectOpen: null }),
  setEnergy: (energy) => set({ energy }),
  setExperienceOpen: (experienceOpen) => set({ experienceOpen }),
  setProjectOpen: (projectOpen) => set({ projectOpen }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}))
