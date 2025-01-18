import { SportmonksCountry } from '../client/types/index'

export function transformCountry(country: SportmonksCountry) {
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
