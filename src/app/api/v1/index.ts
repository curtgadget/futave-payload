import type { Endpoint } from 'payload'
import type { PayloadRequest } from 'payload'
import getTeamPage from './teams'

export type APIRouteV1 = Omit<Endpoint, 'path'> & {
  path: `/v1/${string}` // This enforces that path must start with '/v1'
  middleware?: ((req: PayloadRequest) => Promise<Response | null>)[]
}

const apiV1Routes: APIRouteV1[] = [getTeamPage]

export default apiV1Routes
