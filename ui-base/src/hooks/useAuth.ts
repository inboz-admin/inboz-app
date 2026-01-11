import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/stores";
import { authService, type User } from "@/api/authService";

// Singleton flag to prevent multiple simultaneous API calls
let authCheckInProgress = false;
let authCheckPromise: Promise<void> | null = null;

export function useAuth() {
  const { user, setUser, clearUser } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      // If user already exists in store, skip API call
      if (user) {
        setIsAuthenticated(true);
        setIsLoading(false);
        hasCheckedRef.current = true;
        return;
      }

      // If another component is already checking auth, wait for it
      if (authCheckInProgress && authCheckPromise) {
        try {
          await authCheckPromise;
          // After waiting, check if user was set by the other call
          const currentUser = useAppStore.getState().user;
          if (currentUser) {
            setIsAuthenticated(true);
            setIsLoading(false);
            hasCheckedRef.current = true;
            return;
          }
        } catch (error) {
          // If the other call failed, continue with our own check
        }
      }

      // Check if we've already checked in this component instance
      if (hasCheckedRef.current) {
        return;
      }

      try {
        // First check if we have any stored token
        const hasStoredToken =
          typeof window !== "undefined" &&
          (sessionStorage.getItem("accessToken") ||
            sessionStorage.getItem("app-store"));

        if (!hasStoredToken) {
          console.log("No stored token found, user not authenticated");
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          hasCheckedRef.current = true;
          return;
        }

        // Set flag to prevent duplicate calls
        authCheckInProgress = true;
        authCheckPromise = (async () => {
          try {
            const response = await authService.checkAuthStatus();
            console.log("Auth status response:", response);
            if (response.success && response.data) {
              // Handle nested data structure from server
              const responseData = response.data as {
                data?: { user?: User };
                user?: User;
              };
              const userData = responseData?.data?.user || responseData?.user;
              if (userData) {
                console.log("Setting user:", userData);
                setUser(userData);
                setIsAuthenticated(true);
              } else {
                console.log("No user found in response");
                setUser(null);
                setIsAuthenticated(false);
              }
            } else {
              console.log("No user found in response");
              setUser(null);
              setIsAuthenticated(false);
            }
          } finally {
            authCheckInProgress = false;
            authCheckPromise = null;
          }
        })();

        await authCheckPromise;
      } catch (error) {
        console.log("Auth check error:", error);
        // User is not authenticated
        setUser(null);
        setIsAuthenticated(false);
        authCheckInProgress = false;
        authCheckPromise = null;
      } finally {
        setIsLoading(false);
        hasCheckedRef.current = true;
      }
    };

    checkAuthStatus();
  }, [setUser, user]);

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear all authentication data
      clearUser();
      setIsAuthenticated(false);

      // Explicitly clear all authentication data from sessionStorage
      if (typeof window !== "undefined") {
        console.log(
          "Before logout - sessionStorage keys:",
          Object.keys(sessionStorage)
        );

        // Remove all auth-related items explicitly
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        sessionStorage.removeItem("refresh_token");
        sessionStorage.removeItem("app-store");

        console.log(
          "After removing specific items - sessionStorage keys:",
          Object.keys(sessionStorage)
        );

        // Also try to clear everything
        sessionStorage.clear();

        console.log(
          "After clear() - sessionStorage keys:",
          Object.keys(sessionStorage)
        );

        // Force clear by setting to empty object
        try {
          sessionStorage.setItem("temp", "");
          sessionStorage.removeItem("temp");
        } catch (e) {
          console.log("SessionStorage clear attempt:", e);
        }

        console.log("Final sessionStorage keys:", Object.keys(sessionStorage));
      }

      // Redirect to get-started page (Google OAuth login)
      window.location.href = "/get-started";
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
  };
}
