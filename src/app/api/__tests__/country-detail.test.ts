import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock the auth module before importing anything else
jest.mock('@/utilities/auth', () => ({
  createAuthMiddleware: () => () => Promise.resolve(null),
}))

// Mock the data fetcher
jest.mock('../v1/services/countryDataFetcher', () => ({
  countryDataFetcher: {
    getCountryByIdentifier: jest.fn(),
  },
}))

// Now import after mocking
import { countryDataFetcher } from '../v1/services/countryDataFetcher'
import getCountryPage from '../v1/countryDetail'

describe('Country Detail API', () => {
  const mockCountryData = {
    id: 32,
    name: 'Spain',
    official_name: 'Kingdom of Spain',
    fifa_name: 'ESP',
    iso2: 'ES',
    iso3: 'ESP',
    continent_id: 1,
    flag_url: 'https://cdn.sportmonks.com/images/countries/png/short/es.png',
    coordinates: {
      latitude: '40.396026611328125',
      longitude: '-3.550692558288574',
    },
    borders: ['PT', 'FR', 'AD'],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return country by ID', async () => {
    jest.mocked(countryDataFetcher.getCountryByIdentifier).mockResolvedValue(mockCountryData)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries/32',
    } as any

    const response = await getCountryPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockCountryData)
    expect(countryDataFetcher.getCountryByIdentifier).toHaveBeenCalledWith('32')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=3600')
  })

  it('should return country by ISO2 code', async () => {
    jest.mocked(countryDataFetcher.getCountryByIdentifier).mockResolvedValue(mockCountryData)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries/ES',
    } as any

    const response = await getCountryPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockCountryData)
    expect(countryDataFetcher.getCountryByIdentifier).toHaveBeenCalledWith('ES')
  })

  it('should return country by ISO3 code', async () => {
    jest.mocked(countryDataFetcher.getCountryByIdentifier).mockResolvedValue(mockCountryData)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries/ESP',
    } as any

    const response = await getCountryPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockCountryData)
    expect(countryDataFetcher.getCountryByIdentifier).toHaveBeenCalledWith('ESP')
  })

  it('should return 404 for non-existent country', async () => {
    jest.mocked(countryDataFetcher.getCountryByIdentifier).mockResolvedValue(null)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries/XYZ',
    } as any

    const response = await getCountryPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'Country not found' })
  })

  it('should handle missing identifier', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries/',
    } as any

    const response = await getCountryPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Country identifier is required' })
  })

  it('should handle errors gracefully', async () => {
    jest.mocked(countryDataFetcher.getCountryByIdentifier).mockRejectedValue(
      new Error('Database error')
    )

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries/32',
    } as any

    const response = await getCountryPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'An unexpected error occurred while fetching country data',
    })
  })

  it('should handle invalid request URL', async () => {
    const mockRequest = {
      url: null,
    } as any

    const response = await getCountryPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid request URL' })
  })
})