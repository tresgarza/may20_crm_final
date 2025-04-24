export interface IApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}

export interface IFilteredApiResponse {
  data: Record<string, any>[];
  total: number;
  error: string | null;
  status: number;
} 