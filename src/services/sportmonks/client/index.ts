import { FetchParams, SportmonksConfig, SportmonksResponse } from './types'

export class SportmonksError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: Response,
  ) {
    super(message)
    this.name = 'SportmonksError'
  }
}

export class SportmonksClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(config: SportmonksConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.sportmonks.com/v3/football'

    if (!this.apiKey) {
      throw new Error('Sportmonks API key is required')
    }
  }

  protected async fetchFromApi<T>(
    endpoint: string,
    params: FetchParams = {},
  ): Promise<SportmonksResponse<T>> {
    const queryParams = new URLSearchParams({
      api_token: this.apiKey,
      ...(params.include && { include: params.include }),
      ...(params.page && { page: params.page.toString() }),
      ...Object.entries(params.filters || {}).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value.toString() }),
        {},
      ),
    })

    const url = `${this.baseUrl}${endpoint}?${queryParams}`

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new SportmonksError(
          `Sportmonks API error: ${response.statusText}`,
          response.status,
          response,
        )
      }

      const data = await response.json()
      return data as SportmonksResponse<T>
    } catch (error) {
      if (error instanceof SportmonksError) {
        throw error
      }

      throw new SportmonksError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  protected async fetchAllPages<T>(endpoint: string, params: FetchParams = {}): Promise<T[]> {
    const firstPage = await this.fetchFromApi<T>(endpoint, { ...params, page: 1 })
    const results = [...firstPage.data]

    if (firstPage.pagination?.has_more) {
      const totalPages = Math.ceil(firstPage.pagination.count / firstPage.pagination.per_page)

      const pagePromises = Array.from({ length: totalPages - 1 }, (_, i) =>
        this.fetchFromApi<T>(endpoint, {
          ...params,
          page: i + 2,
        }),
      )

      const pages = await Promise.all(pagePromises)
      pages.forEach((page) => results.push(...page.data))
    }

    return results
  }
}
