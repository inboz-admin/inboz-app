import { create } from 'zustand';

interface ContactSelectionState {
  selectedIds: Set<string>;
  addSelection: (ids: string[]) => void;
  removeSelection: (ids: string[]) => void;
  clearSelection: () => void;
  toggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
}

/**
 * Global contact selection store
 * Preserves selections across pagination pages
 * Used for regular contact operations (export, add-to-list)
 * NOT used for list management (which uses selection sessions)
 */
export const useContactSelectionStore = create<ContactSelectionState>((set, get) => ({
  selectedIds: new Set(),
  
  addSelection: (ids: string[]) => set((state) => {
    const newSet = new Set(state.selectedIds);
    ids.forEach(id => newSet.add(id));
    return { selectedIds: newSet };
  }),
  
  removeSelection: (ids: string[]) => set((state) => {
    const newSet = new Set(state.selectedIds);
    ids.forEach(id => newSet.delete(id));
    return { selectedIds: newSet };
  }),
  
  clearSelection: () => set({ selectedIds: new Set() }),
  
  toggleSelection: (id: string) => set((state) => {
    const newSet = new Set(state.selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedIds: newSet };
  }),
  
  isSelected: (id: string) => get().selectedIds.has(id),
  
  getSelectedCount: () => get().selectedIds.size,
  
  getSelectedIds: () => Array.from(get().selectedIds),
}));

