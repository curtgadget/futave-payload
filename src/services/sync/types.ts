export interface SyncStats {
  created: number
  updated: number
  failed: number
  errors: Array<{
    id: number
    error: string
    data?: unknown
  }>
  startTime: number
  endTime?: number
}

export interface SyncResult {
  success: boolean
  stats: SyncStats
  message: string
}

export interface SyncOptions<T> {
  collection: string
  fetchData: () => Promise<T[]>
  transformData: (item: T) => Record<string, any>
  validateData?: (item: T) => void
  batchSize?: number
}
