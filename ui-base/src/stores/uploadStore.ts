import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UploadState {
  isUploading: boolean;
  currentJobId: string | null;
  currentFileId: string | null;
  progress: any | null;
  selectedFile: File | null;
  organizationId: string | null;
  uploadStartTime: number | null;
}

interface UploadActions {
  setUploading: (isUploading: boolean) => void;
  setCurrentJob: (jobId: string | null, fileId: string | null) => void;
  setProgress: (progress: any | null) => void;
  setSelectedFile: (file: File | null) => void;
  setOrganizationId: (orgId: string | null) => void;
  setUploadStartTime: (time: number | null) => void;
  clearUploadState: () => void;
  hasActiveUpload: () => boolean;
}

const initialState: UploadState = {
  isUploading: false,
  currentJobId: null,
  currentFileId: null,
  progress: null,
  selectedFile: null,
  organizationId: null,
  uploadStartTime: null,
};

export const useUploadStore = create<UploadState & UploadActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUploading: (isUploading) => set({ isUploading }),
      
      setCurrentJob: (jobId, fileId) => set({ 
        currentJobId: jobId, 
        currentFileId: fileId 
      }),
      
      setProgress: (progress) => set({ progress }),
      
      setSelectedFile: (file) => set({ selectedFile: file }),
      
      setOrganizationId: (orgId) => set({ organizationId: orgId }),
      
      setUploadStartTime: (time) => set({ uploadStartTime: time }),
      
      clearUploadState: () => set(initialState),
      
      hasActiveUpload: () => {
        const state = get();
        return state.isUploading && state.currentJobId !== null;
      },
    }),
    {
      name: 'upload-store',
      // Only persist essential state, not the File object
      partialize: (state) => ({
        isUploading: state.isUploading,
        currentJobId: state.currentJobId,
        currentFileId: state.currentFileId,
        progress: state.progress,
        organizationId: state.organizationId,
        uploadStartTime: state.uploadStartTime,
        // Don't persist selectedFile as it's not serializable
      }),
    }
  )
);
