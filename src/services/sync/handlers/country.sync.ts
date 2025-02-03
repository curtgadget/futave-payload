import { SportmonksCountry } from '../../sportmonks/client/types'
import { createCountriesEndpoint } from '../../sportmonks/client/endpoints/countries'
import { transformCountry } from '../../sportmonks/transformers/country.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function createCountrySync(config: SportmonksConfig) {
  const endpoint = createCountriesEndpoint(config)

  return createSyncService<SportmonksCountry>({
    collection: 'countries',
    fetchData: () => endpoint.getAll(),
    transformData: transformCountry,
  })
}
