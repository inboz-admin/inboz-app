export interface IStoredProcedure {
  callStoredProcedure<T = any>(
    procedureName: string,
    params?: any[],
  ): Promise<T>;
}
