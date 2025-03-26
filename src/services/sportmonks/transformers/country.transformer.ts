import { SportmonksCountry } from '../client/types'

export type TransformedCountry = {
  id: number
  continent_id: number
  name: string
  official_name?: string
  fifa_name?: string
  iso2?: string
  iso3?: string
  latitude?: string
  longitude?: string
  geonameid?: number
  borders?: string[]
  image_path?: string
}

export function transformCountry(country: SportmonksCountry): TransformedCountry {
  return {
    id: country.id,
    continent_id: country.continent_id,
    name: country.name,
    official_name: country.official_name,
    fifa_name: country.fifa_name,
    iso2: country.iso2,
    iso3: country.iso3,
    latitude: country.latitude,
    longitude: country.longitude,
    geonameid: country.geonameid,
    borders: country.border,
    image_path: country.image_path,
  }
}
