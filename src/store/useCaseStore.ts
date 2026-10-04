import { create } from 'zustand';
import { CaseFile, CreateCasePayload } from '../types/case';
import { HealthMemoryService } from '../services/HealthMemoryService';

interface CaseStoreState {
  cases: CaseFile[];
  activeCaseId: string | null;
  activeCase: CaseFile | null;
  selectCase: (id: string | null) => void;
  createCase: (payload: CreateCasePayload) => CaseFile;
  updateCase: (id: string, updates: Partial<CaseFile>) => void;
  deleteCase: (id: string) => void;
  archiveCase: (id: string) => void;
  loadDemoCases: () => void;
  clearAllCases: () => void;
  refreshCases: () => void;
}

export const useCaseStore = create<CaseStoreState>((set, get) => {
  const memory = HealthMemoryService.getInstance();
  const initialCases = memory.getCases();

  return {
    cases: initialCases,
    activeCaseId: initialCases.length > 0 ? initialCases[0].id : null,
    activeCase: initialCases.length > 0 ? initialCases[0] : null,

    selectCase: (id: string | null) => {
      if (!id) {
        set({ activeCaseId: null, activeCase: null });
        return;
      }
      const found = memory.getCaseById(id) || null;
      set({ activeCaseId: id, activeCase: found });
    },

    createCase: (payload: CreateCasePayload) => {
      const created = memory.createCase(payload);
      const updatedCases = memory.getCases();
      set({
        cases: updatedCases,
        activeCaseId: created.id,
        activeCase: created,
      });
      return created;
    },

    updateCase: (id: string, updates: Partial<CaseFile>) => {
      memory.updateCase(id, updates);
      const updatedCases = memory.getCases();
      const updatedActive = id === get().activeCaseId ? memory.getCaseById(id) || null : get().activeCase;
      set({
        cases: updatedCases,
        activeCase: updatedActive,
      });
    },

    deleteCase: (id: string) => {
      memory.deleteCase(id);
      const updatedCases = memory.getCases();
      const nextActiveId = updatedCases.length > 0 ? updatedCases[0].id : null;
      const nextActive = nextActiveId ? memory.getCaseById(nextActiveId) || null : null;
      set({
        cases: updatedCases,
        activeCaseId: nextActiveId,
        activeCase: nextActive,
      });
    },

    archiveCase: (id: string) => {
      memory.archiveCase(id);
      const updatedCases = memory.getCases();
      set({
        cases: updatedCases,
        activeCase: get().activeCaseId === id ? memory.getCaseById(id) || null : get().activeCase,
      });
    },

    loadDemoCases: () => {
      memory.loadDemoData();
      const updatedCases = memory.getCases();
      set({
        cases: updatedCases,
        activeCaseId: updatedCases.length > 0 ? updatedCases[0].id : null,
        activeCase: updatedCases.length > 0 ? updatedCases[0] : null,
      });
    },

    clearAllCases: () => {
      memory.clearAllData();
      set({
        cases: [],
        activeCaseId: null,
        activeCase: null,
      });
    },

    refreshCases: () => {
      const updatedCases = memory.getCases();
      const activeId = get().activeCaseId;
      set({
        cases: updatedCases,
        activeCase: activeId ? memory.getCaseById(activeId) || null : null,
      });
    },
  };
});
