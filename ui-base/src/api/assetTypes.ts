export interface Asset {
  id: string;
  organizationId: string;
  url: string;
  filename: string;
  originalname: string;
  mimetype?: string;
  size?: number;
  type?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRequest {
  url: string;
  filename: string;
  originalname: string;
  mimetype?: string;
  size?: number;
  type?: string;
}

export interface GetAssetsParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  type?: string;
}
