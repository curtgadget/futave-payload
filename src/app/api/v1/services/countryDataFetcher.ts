import type { Payload } from 'payload'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

export interface CountryListParams {
  page?: number
  limit?: number
  search?: string
  continentId?: number
  sort?: 'name' | '-name'
}

export interface CountryResponse {
  id: number
  name: string
  official_name: string | null
  fifa_name: string | null
  iso2: string | null
  iso3: string | null
  continent_id: number
  flag_url: string | null
  coordinates: {
    latitude: string | null
    longitude: string | null
  } | null
  borders: string[]
}

export interface CountriesListResponse {
  countries: CountryResponse[]
  pagination: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
    has_next_page: boolean
    has_prev_page: boolean
  }
}

class CountryDataFetcher {
  private payload: Payload | null = null

  private async getPayloadInstance(): Promise<Payload> {
    if (!this.payload) {
      this.payload = await getPayload({ config: configPromise })
    }
    return this.payload
  }

  private transformCountry(country: any): CountryResponse {
    return {
      id: country._id || country.id,
      name: country.name,
      official_name: country.official_name || null,
      fifa_name: country.fifa_name || null,
      iso2: country.iso2 || null,
      iso3: country.iso3 || null,
      continent_id: country.continent_id,
      flag_url: country.image_path || null,
      coordinates: country.latitude && country.longitude
        ? {
            latitude: country.latitude,
            longitude: country.longitude,
          }
        : null,
      borders: country.borders || [],
    }
  }

  async getCountries({
    page = 1,
    limit = 50,
    search,
    continentId,
    sort = 'name',
  }: CountryListParams = {}): Promise<CountriesListResponse> {
    const payload = await this.getPayloadInstance()

    const where: any = {}

    if (search) {
      where.or = [
        { name: { contains: search } },
        { official_name: { contains: search } },
        { fifa_name: { contains: search } },
        { iso2: { equals: search.toUpperCase() } },
        { iso3: { equals: search.toUpperCase() } },
      ]
    }

    if (continentId) {
      where.continent_id = { equals: continentId }
    }

    const result = await payload.find({
      collection: 'countries',
      where,
      sort,
      page,
      limit,
    })

    const countries = result.docs.map((country) => this.transformCountry(country))

    return {
      countries,
      pagination: {
        current_page: result.page,
        per_page: result.limit,
        total: result.totalDocs,
        total_pages: result.totalPages,
        has_next_page: result.hasNextPage,
        has_prev_page: result.hasPrevPage,
      },
    }
  }

  async getCountryByIdentifier(identifier: string | number): Promise<CountryResponse | null> {
    const payload = await this.getPayloadInstance()

    let country = null

    // Try to parse as number for ID lookup
    const numericId = Number(identifier)
    if (!isNaN(numericId)) {
      try {
        country = await payload.findByID({
          collection: 'countries',
          id: numericId,
        })
      } catch (error) {
        // ID not found, continue to other lookups
      }
    }

    // If not found by ID, try ISO codes
    if (!country && typeof identifier === 'string') {
      const upperIdentifier = identifier.toUpperCase()
      
      const result = await payload.find({
        collection: 'countries',
        where: {
          or: [
            { iso2: { equals: upperIdentifier } },
            { iso3: { equals: upperIdentifier } },
          ],
        },
        limit: 1,
      })

      country = result.docs[0] || null
    }

    return country ? this.transformCountry(country) : null
  }

  async getAllCountriesForCache(): Promise<CountryResponse[]> {
    const payload = await this.getPayloadInstance()

    const result = await payload.find({
      collection: 'countries',
      limit: 1000, // Get all countries for caching
      sort: 'name',
    })

    return result.docs.map((country) => this.transformCountry(country))
  }
}

export const countryDataFetcher = new CountryDataFetcher()