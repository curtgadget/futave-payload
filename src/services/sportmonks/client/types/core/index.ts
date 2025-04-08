export type SportmonksConfig = {
  apiKey: string
  baseUrl?: string
}

export type FetchParams = {
  include?: string
  filters?: Record<string, string | number>
  filterString?: string
  page?: number
}

export type SportmonksResponse<T> = {
  data: T[]
  pagination?: {
    count: number
    per_page: number
    current_page: number
    next_page?: number
    has_more: boolean
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
