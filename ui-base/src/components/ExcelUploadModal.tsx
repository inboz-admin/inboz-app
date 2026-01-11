import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import {
  Upload,
  FileText,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  useExcelUpload,
  getProgressMessage,
  getProgressColor,
  formatElapsedTime,
} from "../hooks/useExcelUpload";
import { useUploadStore } from "@/stores/uploadStore";
import { toast } from "sonner";
import { API_CONFIG } from "@/config/constants";
import { contactService } from "@/api/contactService";
import { PlanLimitWarningDialog } from "@/components/plan-limit-warning-dialog";

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  organizationId?: string;
}

export default function ExcelUploadModal({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
}: ExcelUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [limitWarningOpen, setLimitWarningOpen] = useState(false);
  const [limitWarningData, setLimitWarningData] = useState<{
    currentCount: number;
    maxLimit: number;
    planName: string;
    estimatedCount?: number;
  } | null>(null);

  const { uploadFile, progress, isUploading, error, reset, cancelCurrentJob, currentJobId } = useExcelUpload();
  
  // Use global upload store
  const { 
    selectedFile, 
    hasActiveUpload, 
    uploadStartTime,
    setSelectedFile 
  } = useUploadStore();

  // Handle modal opening - don't reset if there's an active upload
  React.useEffect(() => {
    if (isOpen) {
      if (hasActiveUpload()) {
        console.log("🔄 Modal opened with active upload, preserving state");
        setDragActive(false);
      } else {
        console.log("🔄 Modal opened, resetting state");
        reset();
        setSelectedFile(null);
        setDragActive(false);
      }
    }
  }, [isOpen, hasActiveUpload, reset, setSelectedFile]);

  const handleFileSelect = (file: File) => {
    // Prevent new file selection if there's an active upload
    if (hasActiveUpload()) {
      return;
    }

    // Reset any previous state when selecting a new file
    reset();
    
    // Validate file
    try {
      validateFile(file);
      setSelectedFile(file);
    } catch (error) {
      // Error is shown in the file selection area
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    console.log("🔍 Modal upload details:", {
      organizationId,
      filename: selectedFile.name,
      fileSize: selectedFile.size,
    });

    try {
      await uploadFile(selectedFile, organizationId);
    } catch (error: any) {
      // Check if error is a plan limit exceeded error
      const errorData = error?.response?.data || error?.data;
      if (errorData?.limitExceeded && errorData?.limitType === "contacts") {
        setLimitWarningData({
          currentCount: errorData.currentCount || 0,
          maxLimit: errorData.maxLimit || 0,
          planName: errorData.planName || "Current Plan",
        });
        setLimitWarningOpen(true);
      } else {
        // Error is already handled by the hook, but we can show additional info
        const errorMessage =
          errorData?.message ||
          error?.message ||
          "An error occurred during upload";
        if (errorMessage && !error) {
          toast.error(errorMessage);
        }
      }
    }
  };

  const handleClose = () => {
    // If upload is completed, trigger success callback
    if (progress?.stage === "completed" && onSuccess) {
      onSuccess();
    }

    // Simply close the modal - don't reset state if there's an active upload
    // This allows the upload to continue in the background
    if (!hasActiveUpload()) {
      setSelectedFile(null);
      setDragActive(false);
    }

    // Don't call reset() - this preserves the upload state
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file: File): void => {
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

  const downloadTemplate = async () => {
    try {
      const blob = await contactService.downloadTemplate();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "contacts-import-template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download template:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Contacts</DialogTitle>
          <div className="flex items-center justify-between">
            <DialogDescription>
              Import multiple contacts at once using CSV file
            </DialogDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadTemplate}
              className="text-xs gap-1 h-7 shrink-0"
              title="Download import template"
            >
              <Download className="h-3 w-3" />
              Template
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ongoing Upload Status */}
          {hasActiveUpload() && !isUploading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-center space-y-3">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-blue-900 dark:text-blue-100">
                      Upload in Progress
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedFile?.name} is being processed in the background
                    </p>
                    {uploadStartTime && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Started {formatElapsedTime(Date.now() - uploadStartTime)} ago
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelCurrentJob}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/20"
                  >
                    Cancel Upload
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Area */}
          {!selectedFile && !progress && !isUploading && !hasActiveUpload() && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                hasActiveUpload()
                  ? "border-muted-foreground/10 bg-muted/10 cursor-not-allowed opacity-50"
                  : dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/30"
              }`}
              onDragEnter={hasActiveUpload() ? undefined : handleDrag}
              onDragLeave={hasActiveUpload() ? undefined : handleDrag}
              onDragOver={hasActiveUpload() ? undefined : handleDrag}
              onDrop={hasActiveUpload() ? undefined : handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Drop your file here, or{" "}
                <button
                  className={`font-semibold ${
                    hasActiveUpload()
                      ? "text-muted-foreground cursor-not-allowed"
                      : "text-primary hover:underline"
                  }`}
                  onClick={() => !hasActiveUpload() && fileInputRef.current?.click()}
                  disabled={hasActiveUpload()}
                >
                  Browse
                </button>
              </p>
              <p className="text-sm text-muted-foreground">
                CSV files only • Up to 10,000 rows
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={hasActiveUpload()}
                title={hasActiveUpload() ? "Please wait for current upload to complete" : "Select CSV file for bulk upload"}
              />
            </div>
          )}

          {/* Selected File */}
          {selectedFile && !progress && !isUploading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={handleUpload}
                disabled={isUploading || hasActiveUpload()}
                className="w-full"
              >
                {isUploading ? "Uploading..." : "Start Upload"}
              </Button>
            </div>
          )}

          {/* Uploading State - Show when uploading but no progress yet */}
          {isUploading && !progress && (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <div>
                    <p className="text-lg font-medium">Starting Upload...</p>
                    <p className="text-sm text-muted-foreground">
                      Please wait while we process your file
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Display */}
          {progress && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Processing Progress</h3>
                <div className="flex items-center space-x-2">
                  {progress.stage === "completed" && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {progress.stage === "failed" && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {progress.elapsedMs !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {formatElapsedTime(progress.elapsedMs)}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {progress.percentage}%
                  </span>
                </div>
              </div>

              <Progress value={progress.percentage} className="w-full h-1.5" />

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {getProgressMessage(progress)}
                </p>

                {(progress.totalRows !== undefined ||
                  progress.parsedCount !== undefined) && (
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Parsed:</span>
                      <span className="font-bold">
                        {progress.parsedCount || progress.totalRows}
                      </span>
                    </div>
                    {progress.validRows !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Valid:</span>
                        <span className="font-bold text-green-600">
                          {progress.validRows}
                        </span>
                      </div>
                    )}
                    {(progress.invalidRows !== undefined ||
                      progress.validationErrorCount !== undefined) && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Invalid:</span>
                        <span className="font-bold text-red-600">
                          {progress.validationErrorCount ||
                            progress.invalidRows}
                        </span>
                      </div>
                    )}
                    {(progress.insertedRows !== undefined ||
                      progress.uploadedCount !== undefined) && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">New:</span>
                        <span className="font-bold text-blue-600">
                          {progress.uploadedCount || progress.insertedRows}
                        </span>
                      </div>
                    )}
                    {progress.restoredRows !== undefined && progress.restoredRows > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Restored:</span>
                        <span className="font-bold text-green-600">
                          {progress.restoredRows}
                        </span>
                      </div>
                    )}
                    {(progress.duplicatesInFile !== undefined ||
                      progress.duplicatesInDB !== undefined) && (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">
                            Dup(File):
                          </span>
                          <span className="font-bold text-yellow-600">
                            {progress.duplicatesInFile || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">
                            Dup(DB):
                          </span>
                          <span className="font-bold text-orange-600">
                            {progress.duplicatesInDB || 0}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {progress.errors && progress.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800 mb-2">
                      Errors:
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {progress.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {(progress.stage === "completed" ||
                progress.stage === "failed") && (
                <Button 
                  onClick={() => {
                    // Reset the upload state when user clicks Done/Close
                    reset();
                    setSelectedFile(null);
                    setDragActive(false);
                    handleClose();
                  }} 
                  className="w-full"
                >
                  {progress.stage === "completed" ? "Done" : "Close"}
                </Button>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Plan Limit Warning Dialog */}
      {limitWarningData && (
        <PlanLimitWarningDialog
          isOpen={limitWarningOpen}
          onClose={() => setLimitWarningOpen(false)}
          limitType="contacts"
          currentCount={limitWarningData.currentCount}
          maxLimit={limitWarningData.maxLimit}
          planName={limitWarningData.planName}
          onUpgrade={() => {
            setLimitWarningOpen(false);
            // Navigate to subscriptions page or open upgrade modal
            window.location.href = "/subscriptions";
          }}
        />
      )}
    </Dialog>
  );
}
