import { useState, useCallback, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { API_CONFIG } from "@/config/constants";
import { useUploadStore } from "@/stores/uploadStore";

export interface UploadProgress {
  stage:
    | "parsing"
    | "validating"
    | "deduplicating"
    | "inserting"
    | "completed"
    | "failed";
  percentage: number;
  message: string;
  totalRows?: number;
  processedRows?: number;
  validRows?: number;
  invalidRows?: number;
  insertedRows?: number;
  duplicateRows?: number;
  parsedCount?: number;
  validationErrorCount?: number;
  duplicatesInFile?: number;
  duplicatesInDB?: number;
  duplicateCount?: number; // Legacy field
  uploadedCount?: number;
  restoredRows?: number; // 🆕 NEW: Restored soft-deleted contacts
  errors?: string[];
  timestamp?: Date | string;
  elapsedMs?: number; // Elapsed time in milliseconds
}

export interface UploadResult {
  success: boolean;
  fileId: string;
  jobId: string;
  message: string;
  fileInfo: {
    originalName: string;
    size: number;
    mimeType: string;
  };
}

export interface UseExcelUploadReturn {
  uploadFile: (file: File, organizationId?: string) => Promise<UploadResult>;
  progress: UploadProgress | null;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
  cancelCurrentJob: () => Promise<void>;
  currentJobId: string | null;
}

export const useExcelUpload = (): UseExcelUploadReturn => {
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentFileIdRef = useRef<string | null>(null);
  const progressRef = useRef<UploadProgress | null>(null);

  // Use global upload store
  const {
    isUploading,
    currentJobId,
    currentFileId,
    progress,
    selectedFile,
    organizationId,
    uploadStartTime,
    setUploading,
    setCurrentJob,
    setProgress,
    setSelectedFile,
    setOrganizationId,
    setUploadStartTime,
    clearUploadState,
    hasActiveUpload,
  } = useUploadStore();

  const uploadFile = useCallback(
    async (file: File, organizationId?: string): Promise<UploadResult> => {
      // Check if there's already an active upload
      if (hasActiveUpload()) {
        throw new Error("Another upload is already in progress. Please wait for it to complete.");
      }

      // Clean up any existing connection first
      if (socketRef.current) {
        console.log("🧹 Cleaning up existing WebSocket connection");
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      setUploading(true);
      setError(null);
      setProgress(null);
      setSelectedFile(file);
      setOrganizationId(organizationId || null);
      setUploadStartTime(Date.now());
      currentFileIdRef.current = null;

      try {
        // Validate file
        validateFile(file);

        // Get the access token
        const accessToken = sessionStorage.getItem("accessToken");
        if (!accessToken) {
          throw new Error("No access token found. Please log in again.");
        }

        // Build URL with organizationId as query parameter
        let uploadUrl = `${API_CONFIG.baseUrl}/contacts/bulk-upload-advanced`;
        if (organizationId) {
          uploadUrl += `?organizationId=${encodeURIComponent(organizationId)}`;
        }

        console.log("🔍 Frontend upload details:", {
          organizationId,
          uploadUrl,
          filename: file.name,
        });

        // Create FormData
        const formData = new FormData();
        formData.append("file", file);

        // Upload file
        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include", // Include cookies for OAuth authentication
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { message: "Upload failed" };
          }
          // Create error object with response data for limit checking
          const error = new Error(errorData.message || "Upload failed");
          (error as any).response = { data: errorData };
          (error as any).data = errorData;
          throw error;
        }

        const result = await response.json();
        const fileId = result.data?.fileId || result.fileId;
        const jobId = result.data?.jobId || result.jobId;

        if (!fileId) {
          throw new Error("No fileId returned from server");
        }

        // Store fileId and jobId
        currentFileIdRef.current = fileId;
        setCurrentJob(jobId, fileId);
        
        // Connect to WebSocket for real-time progress
        connectToProgressUpdates(fileId);
        
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        setError(errorMessage);
        setUploading(false); // Only set to false on error
        throw err;
      }
    },
    []
  );

  const connectToProgressUpdates = useCallback((fileId: string) => {
    console.log("🔌 Connecting to WebSocket for fileId:", fileId);

    // Clean up any existing connection first
    if (socketRef.current) {
      console.log("🧹 Cleaning up existing WebSocket before new connection");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Connect to WebSocket for real-time progress updates
    const wsBaseUrl = API_CONFIG.baseUrl
      .replace("/api/v1", "")
      .replace("http://", "ws://")
      .replace("https://", "wss://");

    console.log("🌐 WebSocket URL:", wsBaseUrl);

    const socket = io(wsBaseUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Track last progress update time for timeout detection
    let lastProgressTime = Date.now();
    let progressTimeoutId: NodeJS.Timeout | null = null;
    let warningShown = false;

    // Function to check for progress timeout
    const checkProgressTimeout = () => {
      const timeSinceLastUpdate = Date.now() - lastProgressTime;
      const currentProgress = progressRef.current; // Get current progress from ref
      
      // If no progress for 30 seconds, show warning (only once)
      if (timeSinceLastUpdate > 30000 && timeSinceLastUpdate <= 60000 && !warningShown) {
        if (currentProgress && currentProgress.stage !== "failed" && currentProgress.stage !== "completed") {
          warningShown = true;
          toast.warning("Upload seems slow", {
            description: "No progress update received. The upload may be processing a large file.",
            duration: 5000,
          });
        }
      }
      
      // If no progress for 60 seconds, mark as failed
      if (timeSinceLastUpdate > 60000) {
        if (currentProgress && currentProgress.stage !== "failed" && currentProgress.stage !== "completed") {
          const errorMessage = "Upload timeout: No progress update received for 60 seconds. The upload may have failed.";
          setProgress({
            stage: "failed",
            percentage: currentProgress.percentage || 0,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            elapsedMs: timeSinceLastUpdate,
          });
          setError(errorMessage);
          setUploading(false);
          toast.error("Upload Timeout", {
            description: errorMessage,
            duration: 10000,
          });
          
          // Clear timeout
          if (progressTimeoutId) clearInterval(progressTimeoutId);
          
          // Disconnect
          socket.emit("leave-upload-room", fileId);
          socket.disconnect();
        }
      }
    };

    // Start periodic timeout checks (every 10 seconds)
    const startTimeoutCheck = () => {
      if (progressTimeoutId) clearInterval(progressTimeoutId);
      progressTimeoutId = setInterval(checkProgressTimeout, 10000);
    };

    // Join room immediately if already connected, otherwise wait for connect event
    if (socket.connected) {
      console.log("✅ WebSocket already connected, joining room immediately");
      socket.emit("join-upload-room", fileId);
      startTimeoutCheck();
    }

    // Add connection event listeners
    socket.on("connect", () => {
      console.log("✅ WebSocket connected:", socket.id);
      console.log("🚪 Joining upload room for fileId:", fileId);
      socket.emit("join-upload-room", fileId);

      // Test the connection
      setTimeout(() => {
        console.log("🧪 Testing WebSocket connection...");
        socket.emit("test-connection");
      }, 1000);
      
      // Emit initial progress to show connection is working
      const initialProgress = {
        stage: "parsing" as const,
        percentage: 0,
        message: "Connected to progress updates. Starting processing...",
        timestamp: new Date().toISOString(),
      };
      progressRef.current = initialProgress;
      setProgress(initialProgress);
      
      lastProgressTime = Date.now();
      startTimeoutCheck();
    });

    socket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 WebSocket disconnected:", reason);
      if (progressTimeoutId) clearInterval(progressTimeoutId);
    });

    // Test connection
    socket.on("test-response", (data) => {
      console.log("🧪 Test response received:", data);
    });

    // Listen for progress updates
    socket.on(`upload-progress-${fileId}`, (progressData: UploadProgress) => {
      console.log("📊 Progress update received for fileId:", fileId);
      console.log("📊 Current fileId ref:", currentFileIdRef.current);
      console.log("📊 Progress data:", JSON.stringify(progressData, null, 2));
      console.log("📊 Timestamp:", progressData.timestamp);
      
      // Update last progress time
      lastProgressTime = Date.now();
      
      // Only update progress if this is for the current file
      if (currentFileIdRef.current === fileId) {
        progressRef.current = progressData; // Update ref
        setProgress(progressData);
      } else {
        console.log("⚠️ Ignoring progress update for different fileId");
      }

      // Show toast for important updates
      if (progressData.stage === "completed") {
        const parsed = progressData.parsedCount || progressData.totalRows || 0;
        const valid = progressData.validRows || 0;
        const invalid =
          progressData.validationErrorCount || progressData.invalidRows || 0;
        const inserted =
          progressData.uploadedCount || progressData.insertedRows || 0;
        const restored = progressData.restoredRows || 0;
        const duplicatesInFile = progressData.duplicatesInFile || 0;
        const duplicatesInDB = progressData.duplicatesInDB || 0;
        const totalDuplicates = duplicatesInFile + duplicatesInDB;
        
        // Clear timeout checks
        if (progressTimeoutId) clearInterval(progressTimeoutId);
        
        // Set uploading to false when completed
        setUploading(false);
        
        // Disconnect after completion
        socket.emit("leave-upload-room", fileId);
        socket.disconnect();
      } else if (progressData.stage === "failed") {
        // Clear timeout checks
        if (progressTimeoutId) clearInterval(progressTimeoutId);
        
        // Set uploading to false when failed
        setUploading(false);
        
        // Show error toast with detailed message
        const errorMessage = progressData.message || progressData.errors?.[0] || "Upload failed";
        toast.error("Upload Failed", {
          description: errorMessage,
          duration: 10000, // Show for 10 seconds
        });
        
        // Set error state
        setError(errorMessage);
        
        // Disconnect after failure
        socket.emit("leave-upload-room", fileId);
        socket.disconnect();
      }
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      if (progressTimeoutId) clearInterval(progressTimeoutId);
      toast.error("Failed to connect to progress updates. Please refresh and try again.");
      setUploading(false);
    });

    // Set a timeout to handle cases where WebSocket doesn't connect
    const connectionTimeout = setTimeout(() => {
      if (!socket.connected) {
        console.error("WebSocket connection timeout");
        if (progressTimeoutId) clearInterval(progressTimeoutId);
        toast.error("Connection timeout. Please refresh and try again.");
        setUploading(false);
        socket.disconnect();
      }
    }, 10000); // 10 second timeout

    // Clear timeout when connected
    socket.on("connect", () => {
      clearTimeout(connectionTimeout);
    });
  }, []);

  const cancelCurrentJob = useCallback(async () => {
    if (!currentJobId) {
      console.log("No job to cancel");
      return;
    }

    try {
      console.log("🚫 Cancelling job:", currentJobId);
      
      const accessToken = sessionStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(
        `${API_CONFIG.baseUrl}/contacts/cancel-bulk-upload/${currentJobId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        }
      );

      if (response.ok) {
        console.log("✅ Job cancelled successfully");
        setCurrentJob(null, null);
        setUploading(false);
        setProgress({
          stage: "failed",
          percentage: 0,
          message: "Upload cancelled by user",
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error("Failed to cancel job");
      }
    } catch (error) {
      console.error("❌ Failed to cancel job:", error);
    }
  }, [currentJobId]);

  const reset = useCallback(() => {
    console.log("🔄 Resetting upload state");
    
    // Store current fileId before clearing it
    const currentFileId = currentFileIdRef.current;
    
    // Clear all upload state
    clearUploadState();
    setError(null);
    currentFileIdRef.current = null;

    // Disconnect WebSocket properly
    if (socketRef.current) {
      console.log("🔌 Disconnecting WebSocket");
      
      // Leave room if we have a fileId
      if (currentFileId) {
        socketRef.current.emit("leave-upload-room", currentFileId);
      }
      
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [clearUploadState]);

  // Reconnect to WebSocket if there's an active upload when hook mounts
  useEffect(() => {
    if (hasActiveUpload() && currentFileId && !socketRef.current) {
      console.log("🔄 Reconnecting to active upload:", currentFileId);
      connectToProgressUpdates(currentFileId);
    }
  }, [currentFileId, hasActiveUpload, connectToProgressUpdates]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    uploadFile,
    progress,
    isUploading,
    error,
    reset,
    cancelCurrentJob,
    currentJobId,
  };
};

// File validation helper
const validateFile = (file: File): void => {
  // File size validation (50MB max)
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxFileSize) {
    throw new Error(
      `File size (${Math.round(
        file.size / 1024 / 1024
      )}MB) exceeds maximum allowed size of 50MB`
    );
  }

  // Only allow CSV files
  const allowedExtensions = [".csv"];

  const fileExtension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."));

  if (!allowedExtensions.includes(fileExtension)) {
    throw new Error("Please select a valid CSV (.csv) file only");
  }
};

// Format elapsed time helper
export const formatElapsedTime = (elapsedMs?: number): string => {
  if (!elapsedMs) return "";

  const totalSeconds = elapsedMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    // Show minutes and seconds with 1 decimal
    return `${minutes}m ${seconds.toFixed(1)}s`;
  }

  // Show seconds with 1 decimal place for better precision
  return `${seconds.toFixed(1)}s`;
};

// Progress component helper
export const getProgressMessage = (progress: UploadProgress): string => {
  const timeStr = progress.elapsedMs
    ? ` (${formatElapsedTime(progress.elapsedMs)})`
    : "";

  switch (progress.stage) {
    case "parsing":
      const parsed = progress.processedRows || progress.parsedCount || 0;
      // During parsing, we don't know total yet, so just show parsed count
      return `Parsing file... ${parsed} rows${timeStr}`;
    case "validating":
      return `Validating data... ${progress.validRows || 0} valid, ${
        progress.invalidRows || progress.validationErrorCount || 0
      } invalid${timeStr}`;
    case "deduplicating":
      return `Checking for duplicates...${timeStr}`;
    case "inserting":
      return `Inserting contacts... ${
        progress.insertedRows || progress.uploadedCount || 0
      } inserted${timeStr}`;
    case "completed":
      const totalDups =
        (progress.duplicatesInFile || 0) + (progress.duplicatesInDB || 0);
      return `Completed! ${
        progress.uploadedCount || progress.insertedRows || 0
      } contacts inserted, ${totalDups} duplicates skipped${timeStr}`;
    case "failed":
      return `Failed: ${progress.message}${timeStr}`;
    default:
      return `${progress.message}${timeStr}`;
  }
};

// Progress bar color helper
export const getProgressColor = (stage: UploadProgress["stage"]): string => {
  switch (stage) {
    case "parsing":
      return "bg-blue-500";
    case "validating":
      return "bg-yellow-500";
    case "deduplicating":
      return "bg-purple-500";
    case "inserting":
      return "bg-green-500";
    case "completed":
      return "bg-green-600";
    case "failed":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};
