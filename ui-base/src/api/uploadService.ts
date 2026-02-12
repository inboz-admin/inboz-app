import { API_CONFIG } from "@/config/constants";

export interface UploadedImage {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  thumbnailUrl?: string;
  /** Object URL for instant preview before server URL loads; revoke when done */
  previewUrl?: string;
}

export interface UploadImageResponse {
  success: boolean;
  message: string;
  files: UploadedImage[];
  totalFiles: number;
  totalSize: number;
  uploadTime: number;
}

/**
 * Get the server base URL (without /api/v1) for upload endpoints.
 * Multer controller is at /upload, not under /api/v1.
 */
function getUploadBaseUrl(): string {
  return API_CONFIG.baseUrl.replace(/\/api\/v1\/?$/, "") || API_CONFIG.baseUrl;
}

/**
 * Upload an image file to the server using the existing Multer module.
 * Uses the same fetch + FormData pattern as useExcelUpload.
 *
 * @param file - The image file to upload
 * @returns The uploaded file info including full URL for use in templates
 */
export async function uploadImage(file: File): Promise<UploadedImage> {
  const accessToken = sessionStorage.getItem("accessToken");
  if (!accessToken) {
    throw new Error("No access token found. Please log in again.");
  }

  const uploadUrl = `${getUploadBaseUrl()}/upload/image`;

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    let errorData: { message?: string };
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: "Upload failed" };
    }
    const error = new Error(errorData.message || "Upload failed");
    (error as Error & { statusCode?: number }).statusCode = response.status;
    throw error;
  }

  const result: UploadImageResponse = await response.json();

  // Handle NestJS SuccessInterceptor wrapper (data may be nested)
  const data = (result as any).data ?? result;
  const files = data.files ?? [];
  const uploadedFile = files[0];

  if (!uploadedFile?.url) {
    throw new Error("No URL returned from upload");
  }

  return {
    url: uploadedFile.url,
    filename: uploadedFile.filename,
    originalname: uploadedFile.originalname,
    mimetype: uploadedFile.mimetype,
    size: uploadedFile.size,
    thumbnailUrl: uploadedFile.thumbnailUrl,
  };
}
