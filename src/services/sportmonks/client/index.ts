import { FetchParams, SportmonksConfig, SportmonksResponse } from './types'

export function createSportmonksError(
  message: string,
  statusCode?: number,
  response?: Response,
): Error & { statusCode?: number; response?: Response } {
  return Object.assign(new Error(message), {
    name: 'SportmonksError',
    statusCode,
    response,
  })
}

export function createSportmonksClient(config: SportmonksConfig) {
  const apiKey = config.apiKey
  const baseUrl = config.baseUrl || 'https://api.sportmonks.com/v3/football'

  if (!apiKey) {
    throw new Error('Sportmonks API key is required')
  }

  async function fetchFromApi<T>(
    endpoint: string,
    params: FetchParams = {},
  ): Promise<SportmonksResponse<T>> {
    const queryParams = new URLSearchParams({
      api_token: apiKey,
      ...(params.include && { include: params.include }),
      ...(params.page && { page: params.page.toString() }),
      ...Object.entries(params.filters || {}).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value.toString() }),
        {},
      ),
    })

    const url = `${baseUrl}${endpoint}?${queryParams}`

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw createSportmonksError(
          `Sportmonks API error: ${response.statusText}`,
          response.status,
          response,
        )
      }

      const data = await response.json()
      return data as SportmonksResponse<T>
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error
      }

      throw createSportmonksError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  async function fetchAllPages<T>(endpoint: string, params: FetchParams = {}): Promise<T[]> {
    const firstPage = await fetchFromApi<T>(endpoint, { ...params, page: 1 })
    const results = [...firstPage.data]

    if (firstPage.pagination?.has_more) {
      const totalPages = Math.ceil(firstPage.pagination.count / firstPage.pagination.per_page)

      const pagePromises = Array.from({ length: totalPages - 1 }, (_, i) =>
        fetchFromApi<T>(endpoint, {
          ...params,
          page: i + 2,
        }),
      )

      const pages = await Promise.all(pagePromises)
      pages.forEach((page) => results.push(...page.data))
    }

    return results
  }

  return {
    fetchFromApi,
    fetchAllPages,
  }
}
