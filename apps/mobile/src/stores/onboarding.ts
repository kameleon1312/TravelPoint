import { create } from 'zustand';
import type { Archetype } from '@travelpoint/types';

interface OnboardingState {
  archetype: Archetype | null;
  territories: string[];
  obsessions: string[];
  setArchetype: (a: Archetype) => void;
  setTerritories: (t: string[]) => void;
  setObsessions: (o: string[]) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  archetype: null,
  territories: [],
  obsessions: [],
  setArchetype: (archetype) => set({ archetype }),
  setTerritories: (territories) => set({ territories }),
  setObsessions: (obsessions) => set({ obsessions }),
  reset: () => set({ archetype: null, territories: [], obsessions: [] }),
}));
