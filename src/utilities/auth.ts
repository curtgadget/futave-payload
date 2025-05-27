import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import config from '@/payload.config'
import crypto from 'crypto'

export async function verifyAPIKey(req: PayloadRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  console.log('🔑 Auth Header:', authHeader)

  if (!authHeader?.startsWith('API-Key ')) {
    console.log('❌ Invalid Authorization header format')
    return false
  }

  try {
    const payload = await getPayload({ config })
    const apiKey = authHeader.replace('API-Key ', '')
    const apiKeyIndex = crypto.createHmac('sha1', payload.secret).update(apiKey).digest('hex')

    const userQuery = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        apiKeyIndex: {
          equals: apiKeyIndex,
        },
        enableAPIKey: {
          equals: true,
        },
      },
    })

    if (!userQuery.docs?.[0]) {
      console.log('❌ API Key validation failed')
      return false
    }

    const user = userQuery.docs[0]
    console.log('✅ Valid API Key for user:', user.email)
    return true
  } catch (error) {
    console.error('❌ Error verifying API key:', error)
    return false
  }
}

export function createAuthMiddleware() {
  return async (req: PayloadRequest) => {
    console.log('\n🔒 Starting API Key Authentication')
    console.log('📝 Request URL:', req.url)
    console.log('📝 Request Method:', req.method)

    // Bypass authentication in development mode (unless FORCE_AUTH is set)
    if (process.env.NODE_ENV === 'development' && !process.env.FORCE_AUTH) {
      console.log('🚀 Development mode: Bypassing API key authentication')
      return null // Continue to next middleware/handler
    }

    const isAuthenticated = await verifyAPIKey(req)

    if (!isAuthenticated) {
      console.log('❌ Authentication failed - sending 401 response\n')
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    console.log('✅ Authentication successful - proceeding to handler\n')
    return null // Continue to next middleware/handler
  }
}
