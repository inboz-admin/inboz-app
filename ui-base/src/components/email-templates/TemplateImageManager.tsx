"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Upload, Copy, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { uploadImage, type UploadedImage } from "@/api/uploadService";
import { assetService } from "@/api/assetService";
import type { Asset } from "@/api/assetTypes";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assetToDisplayImage(a: Asset): UploadedImage {
  return {
    url: a.url,
    filename: a.filename,
    originalname: a.originalname,
    mimetype: a.mimetype ?? "",
    size: a.size ?? 0,
  };
}

interface TemplateImageManagerProps {
  images: UploadedImage[];
  onUploaded: (image: UploadedImage) => void;
  onUseImage?: (url: string) => void;
}

export function TemplateImageManager({
  images,
  onUploaded,
  onUseImage,
}: TemplateImageManagerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  // Fetch assets from backend (scoped by user/org)
  useEffect(() => {
    let cancelled = false;
    setLoadingAssets(true);
    assetService
      .getAssets({ limit: 100, type: "image" })
      .then((res) => {
        if (cancelled || !res.success || !res.data?.data) return;
        setAssets(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setAssets([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAssets(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Combined list: session images first, then assets (dedupe by url)
  const displayImages = useMemo(() => {
    const seen = new Set<string>();
    const list: UploadedImage[] = [];
    for (const img of images) {
      if (!seen.has(img.url)) {
        seen.add(img.url);
        list.push(img);
      }
    }
    for (const a of assets) {
      if (!seen.has(a.url)) {
        seen.add(a.url);
        list.push(assetToDisplayImage(a));
      }
    }
    return list;
  }, [images, assets]);

  // Revoke object URLs when component unmounts
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please use JPEG, PNG, GIF, or WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploading(true);
    try {
      const result = await uploadImage(file);
      onUploaded({ ...result, previewUrl });
      // Register in assets table (scoped by user/org)
      try {
        const createRes = await assetService.createAsset({
          url: result.url,
          filename: result.filename,
          originalname: result.originalname,
          mimetype: result.mimetype,
          size: result.size,
          type: "image",
        });
        if (createRes.success && createRes.data) {
          setAssets((prev) => [createRes.data!, ...prev]);
        } else if (!createRes.success) {
          toast.error(createRes.message || "Failed to save asset");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to save asset";
        toast.error(msg);
      }
      toast.success("Image uploaded successfully");
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = "";
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
    if (file && ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      handleFileSelect(file);
    } else if (file) {
      toast.error("Invalid file type. Please use JPEG, PNG, GIF, or WebP.");
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          uploading
            ? "border-muted-foreground/10 bg-muted/10 cursor-not-allowed opacity-50"
            : dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/30"
        }`}
        onDragEnter={uploading ? undefined : handleDrag}
        onDragLeave={uploading ? undefined : handleDrag}
        onDragOver={uploading ? undefined : handleDrag}
        onDrop={uploading ? undefined : handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
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
            <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP • Max 10MB</p>
          </>
        )}
      </div>

      {/* Image list */}
      {(displayImages.length > 0 || loadingAssets) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {loadingAssets ? "Loading assets…" : "Uploaded images"}
          </p>
          <ScrollArea className="h-[160px] rounded-md border">
            <div className="p-2 space-y-2">
              {displayImages.map((img, index) => (
                <div
                  key={`${img.url}-${index}`}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center">
                    {failedUrls.has(img.url) && !img.previewUrl ? (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <img
                        src={img.previewUrl || img.url}
                        alt={img.originalname}
                        className="w-full h-full object-cover"
                        onError={() => {
                          if (!img.previewUrl) {
                            setFailedUrls((prev) => new Set(prev).add(img.url));
                          }
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{img.originalname}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(img.size)}</p>
                  </div>
                  <div className="flex-shrink-0 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleCopyUrl(img.url)}
                      title="Copy URL"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {onUseImage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => onUseImage(img.url)}
                      >
                        Use
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
