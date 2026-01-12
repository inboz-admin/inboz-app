import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/api/authService";

export type Theme = "light" | "dark" | "system";

interface AppState {
  // Theme state
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  platformView: boolean; // For SUPERADMIN analytics platform view
  setPlatformView: (enabled: boolean) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  pushNotificationPromptDismissed: boolean;
  setPushNotificationPromptDismissed: (dismissed: boolean) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Notifications
  notifications: Array<{
    id: string;
    type: "success" | "error" | "warning" | "info";
    message: string;
    duration?: number;
  }>;
  addNotification: (
    notification: Omit<AppState["notifications"][0], "id">
  ) => void;
  removeNotification: (id: string) => void;

  // Reset store
  reset: () => void;

  // Clear user data specifically
  clearUser: () => void;
}

const initialState = {
  theme: "system" as Theme,
  user: null,
  selectedOrganizationId: null,
  platformView: false,
  sidebarOpen: false,
  pushNotificationPromptDismissed: false,
  isLoading: false,
  notifications: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTheme: (theme) => set({ theme }),

      setUser: (user) => set({ user }),
      setSelectedOrganizationId: (selectedOrganizationId) => set({ selectedOrganizationId }),
      setPlatformView: (platformView) => set({ platformView }),

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setPushNotificationPromptDismissed: (pushNotificationPromptDismissed) => 
        set({ pushNotificationPromptDismissed }),

      setIsLoading: (isLoading) => set({ isLoading }),

      addNotification: (notification) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNotification = { ...notification, id };
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove notification after duration (default: 5000ms)
        const duration = notification.duration || 5000;
        setTimeout(() => {
          get().removeNotification(id);
        }, duration);
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      reset: () => set(initialState),

      clearUser: () => set({ user: null }),
    }),
    {
      name: "app-store",
      storage: {
        getItem: (name) => {
          if (typeof window !== "undefined") {
            const item = sessionStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          }
          return null;
        },
        setItem: (name, value) => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(name, JSON.stringify(value));
          }
        },
        removeItem: (name) => {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(name);
          }
        },
      },
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
        selectedOrganizationId: state.selectedOrganizationId,
        platformView: state.platformView,
        pushNotificationPromptDismissed: state.pushNotificationPromptDismissed,
      }),
    }
  )
);

/**
 * Get app store state without using React hook
 * Useful for accessing store state outside React components (e.g., in apiService)
 */
export const getAppStoreState = (): AppState => {
  return useAppStore.getState();
};
