import { FetchParams, SportmonksConfig, SportmonksResponse } from './types'
import { SPORTMONKS_FOOTBALL_BASE_URL } from '@/constants/api'

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
  const baseUrl = config.baseUrl || SPORTMONKS_FOOTBALL_BASE_URL

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
      ...(params.filterString && { filters: params.filterString }),
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
    const results: T[] = []
    let currentPage = 1

    while (true) {
      const response = await fetchFromApi<T>(endpoint, { ...params, page: currentPage })
      results.push(...response.data)

      if (!response.pagination?.has_more || !response.pagination?.next_page) {
        break
      }

      try {
        // Extract page number from next_page URL string
        const nextPageUrl = new URL(response.pagination.next_page.toString())
        const nextPage = nextPageUrl.searchParams.get('page')
        if (!nextPage) {
          break
        }

        currentPage = parseInt(nextPage, 10)
      } catch (_error) {
        // If we can't parse the next_page URL, stop pagination
        break
      }
    }

    return results
  }

  return {
    fetchFromApi,
    fetchAllPages,
  }
}
