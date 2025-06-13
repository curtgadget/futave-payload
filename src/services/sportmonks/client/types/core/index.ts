export type SportmonksConfig = {
  apiKey: string
  baseUrl?: string
  concurrencyLimit?: number // Maximum number of concurrent API requests
}

export type FetchParams = {
  include?: string
  filters?: Record<string, string | number>
  filterString?: string
  page?: number
  per_page?: number
}

export type SportmonksResponse<T> = {
  data: T[]
  pagination?: {
    count: number
    per_page: number
    current_page: number
    next_page?: number
    has_more: boolean
    total_pages?: number // Total number of pages available
  }
  rate_limit?: {
    remaining: number
    resets_in_seconds: number
    requested_entity: string
  }
}

export type SportmonksMetadataType = {
  id: number
  parent_id: number | null
  name: string
  code: string
  developer_name: string | null
  model_type: string | null
  group: string | null
  description: string | null
}
