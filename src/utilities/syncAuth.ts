import type { PayloadRequest } from 'payload'
import { NextRequest } from 'next/server'

/**
 * Verify that a request contains a valid sync token.
 * Works with both PayloadRequest (Payload endpoints) and NextRequest (Next.js API routes).
 */
export function verifySyncToken(req: PayloadRequest | NextRequest | Request): boolean {
  // Both PayloadRequest and NextRequest support headers.get()
  const token = req.headers.get('x-sync-token')
  const expectedToken = process.env.SYNC_SECRET_TOKEN

  if (!expectedToken) {
    console.warn('⚠️ SYNC_SECRET_TOKEN not configured - rejecting request')
    return false
  }

  return token === expectedToken
}

/**
 * Middleware for sync endpoint authentication.
 * Follows the same pattern as createAuthMiddleware() in auth.ts.
 * Returns null to continue, or a Response to block.
 */
export function createSyncAuthMiddleware() {
  return (req: PayloadRequest | NextRequest | Request): Response | null => {
    console.log('🔐 Sync Auth: Checking x-sync-token')

    // Bypass authentication in development mode (unless FORCE_AUTH is set)
    if (process.env.NODE_ENV === 'development' && !process.env.FORCE_AUTH) {
      console.log('🚀 Development mode: Bypassing sync token authentication')
      return null // Continue to handler
    }

    if (!verifySyncToken(req)) {
      console.log('❌ Sync auth failed - invalid or missing x-sync-token')
      return new Response(
        JSON.stringify({
          error: 'Unauthorized - invalid or missing x-sync-token header',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    console.log('✅ Sync auth successful')
    return null // Continue to handler
  }
}
