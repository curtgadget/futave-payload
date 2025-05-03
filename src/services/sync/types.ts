export type SyncStats = {
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

export type SyncResult = {
  success: boolean
  stats: SyncStats
  message: string
}

export type SyncOptions<T> = {
  collection: string
  fetchData: () => Promise<T[]>
  transformData: (item: T) => Record<string, any> | Promise<Record<string, any>>
  validateData?: (item: T) => void
  batchSize?: number // Size of batches for processing
  concurrency?: number // Number of concurrent operations
}
