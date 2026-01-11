import { useState, useCallback } from "react";
import {
  selectionSessionService,
  type SelectionState,
} from "@/api/selectionSessionService";
import { toast } from "sonner";

export const useSelectionSession = (listId: string) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selection session
  const initializeSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await selectionSessionService.createSession(listId);

      if (response.success && response.data) {
        setSessionId(response.data.sessionId);
        await refreshSelectionState(response.data.sessionId);
      } else {
        throw new Error(response.message || "Failed to create session");
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to initialize selection";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  // Refresh selection state
  const refreshSelectionState = useCallback(
    async (currentSessionId?: string) => {
      const id = currentSessionId || sessionId;
      if (!id) return;

      try {
        const response = await selectionSessionService.getSelectionState(id);

        if (response.success && response.data) {
          setSelectionState(response.data);
        } else {
          throw new Error(response.message || "Failed to get selection state");
        }
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to refresh selection";
        setError(errorMessage);
        // Don't show toast for refresh errors to avoid spam
      }
    },
    [sessionId]
  );

  // Update selection (optimistic)
  const updateSelection = useCallback(
    async (contactIds: string[], operation: "add" | "remove") => {
      if (!sessionId) return;

      // Optimistic update
      const optimisticState = calculateOptimisticState(
        selectionState,
        contactIds,
        operation
      );
      setSelectionState(optimisticState);

      try {
        const response = await selectionSessionService.updateSelection(
          sessionId,
          {
            contactIds,
            operation,
          }
        );

        if (response.success && response.data) {
          setSelectionState(response.data);
        } else {
          // Rollback on error
          await refreshSelectionState();
          throw new Error(response.message || "Failed to update selection");
        }
      } catch (err: any) {
        // Rollback on error
        await refreshSelectionState();
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update selection";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    },
    [sessionId, selectionState, refreshSelectionState]
  );

  // Apply selection to list
  const applySelection = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await selectionSessionService.applySelection(sessionId);

      if (response.success && response.data) {
        // Clear session
        setSessionId(null);
        setSelectionState(null);

        toast.success(
          `List updated: ${response.data.addedCount} added, ${response.data.removedCount} removed`
        );

        return response.data;
      } else {
        throw new Error(response.message || "Failed to apply selection");
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to apply selection";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Reset selection to original state (discard changes)
  const resetSelectionToOriginal = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await selectionSessionService.resetSelectionToOriginal(
        sessionId
      );

      if (response.success && response.data) {
        setSelectionState(response.data);
        toast.success("Selection reset to original state");
      } else {
        throw new Error(response.message || "Failed to reset selection");
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reset selection";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Clear session (for cleanup)
  const clearSession = useCallback(() => {
    setSessionId(null);
    setSelectionState(null);
    setError(null);
  }, []);

  return {
    sessionId,
    selectionState,
    loading,
    error,
    initializeSession,
    updateSelection,
    applySelection,
    resetSelectionToOriginal,
    refreshSelectionState,
    clearSession,
  };
};

// Helper function to calculate optimistic state
function calculateOptimisticState(
  currentState: SelectionState | null,
  contactIds: string[],
  operation: "add" | "remove"
): SelectionState | null {
  if (!currentState) return null;

  const currentSelection = new Set(currentState.currentSelection);

  if (operation === "add") {
    contactIds.forEach((id) => currentSelection.add(id));
  } else {
    contactIds.forEach((id) => currentSelection.delete(id));
  }

  const newSelection = Array.from(currentSelection);
  const addedCount = newSelection.filter(
    (id) => !currentState.currentSelection.includes(id)
  ).length;
  const removedCount = currentState.currentSelection.filter(
    (id) => !newSelection.includes(id)
  ).length;

  return {
    ...currentState,
    currentSelection: newSelection,
    totalSelected: newSelection.length,
    addedCount: currentState.addedCount + addedCount,
    removedCount: currentState.removedCount + removedCount,
  };
}
