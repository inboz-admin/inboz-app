import { apiService } from "./apiService";
import type { Asset, CreateAssetRequest, GetAssetsParams } from "./assetTypes";
import type { BaseResponse, PaginatedData } from "./types";

class AssetService {
  private baseUrl = "/assets";

  async getAssets(
    params: GetAssetsParams = {}
  ): Promise<BaseResponse<PaginatedData<Asset>>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.searchTerm) queryParams.append("searchTerm", params.searchTerm);
    if (params.type) queryParams.append("type", params.type);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  async createAsset(
    data: CreateAssetRequest
  ): Promise<BaseResponse<Asset>> {
    return apiService.post(this.baseUrl, data);
  }

  async getAsset(id: string): Promise<BaseResponse<Asset>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  async deleteAsset(id: string): Promise<BaseResponse<Asset>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }
}

export const assetService = new AssetService();
