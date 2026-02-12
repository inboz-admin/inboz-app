"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/api/uploadService";
import { assetService } from "@/api/assetService";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddAssetModal({
  open,
  onOpenChange,
  onSuccess,
}: AddAssetModalProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Use JPEG, PNG, GIF, or WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadImage(file);
      const createRes = await assetService.createAsset({
        url: result.url,
        filename: result.filename,
        originalname: result.originalname,
        mimetype: result.mimetype,
        size: result.size,
        type: "image",
      });
      if (createRes.success) {
        toast.success("Asset added successfully");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(createRes.message || "Failed to save asset");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Asset</DialogTitle>
          <DialogDescription>
            Upload an image to add it to your assets. It will be available in templates and campaigns.
          </DialogDescription>
        </DialogHeader>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            uploading
              ? "border-muted-foreground/10 bg-muted/10 cursor-not-allowed opacity-50"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) e.currentTarget.classList.add("border-primary/50");
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-primary/50");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-primary/50");
            if (uploading) return;
            const file = e.dataTransfer.files[0];
            if (file && ACCEPTED_IMAGE_TYPES.includes(file.type)) {
              handleFileSelect(file);
            } else if (file) {
              toast.error("Invalid file type. Use JPEG, PNG, GIF, or WebP.");
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={handleInputChange}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drop image here, or{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, GIF, WebP • Max 10MB
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
