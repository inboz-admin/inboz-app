export interface IDatabaseQuery {
  query<T = any>(sql: string, params?: any[]): Promise<T>;
}
