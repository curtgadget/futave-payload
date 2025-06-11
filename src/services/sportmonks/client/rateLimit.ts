import pLimit from 'p-limit'

export const RATE_LIMITS = {
  API_REQUESTS: 10, // Max 10 concurrent API requests
  RETRY_ATTEMPTS: 3, // Max retry attempts for 429 errors
  RETRY_DELAY: 1000, // Base delay in milliseconds
  BACKOFF_MULTIPLIER: 2, // Exponential backoff multiplier
  RATE_LIMIT_DELAY: 60000, // Wait 60 seconds on rate limit before retry
}

// Create a rate limiter for API requests
export const apiRateLimit = pLimit(RATE_LIMITS.API_REQUESTS)

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wraps a fetch function with rate limiting and retry logic
 */
export async function withRateLimit<T>(
  fetchFn: () => Promise<T>,
  context: string = 'API request'
): Promise<T> {
  return apiRateLimit(async () => {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= RATE_LIMITS.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`${context}: Attempt ${attempt}/${RATE_LIMITS.RETRY_ATTEMPTS}`)
        const result = await fetchFn()
        
        if (attempt > 1) {
          console.log(`${context}: Success on attempt ${attempt}`)
        }
        
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Check if this is a rate limit error (429)
        const isRateLimit = (error as any)?.statusCode === 429
        
        if (isRateLimit) {
          console.warn(`${context}: Rate limit hit (429), attempt ${attempt}/${RATE_LIMITS.RETRY_ATTEMPTS}`)
          
          if (attempt < RATE_LIMITS.RETRY_ATTEMPTS) {
            // Wait longer for rate limits
            const delay = RATE_LIMITS.RATE_LIMIT_DELAY
            console.log(`${context}: Waiting ${delay}ms before retry due to rate limit`)
            await sleep(delay)
            continue
          }
        } else {
          // For other errors, use exponential backoff
          console.warn(`${context}: Error on attempt ${attempt}:`, lastError.message)
          
          if (attempt < RATE_LIMITS.RETRY_ATTEMPTS) {
            const delay = RATE_LIMITS.RETRY_DELAY * Math.pow(RATE_LIMITS.BACKOFF_MULTIPLIER, attempt - 1)
            console.log(`${context}: Waiting ${delay}ms before retry`)
            await sleep(delay)
            continue
          }
        }
      }
    }
    
    // All attempts failed
    console.error(`${context}: All ${RATE_LIMITS.RETRY_ATTEMPTS} attempts failed`)
    throw lastError || new Error('All retry attempts failed')
  })
}

/**
 * Batch process items with rate limiting
 */
export async function batchRateLimit<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  batchSize: number = 5,
  context: string = 'Batch processing'
): Promise<R[]> {
  const results: R[] = []
  
  console.log(`${context}: Processing ${items.length} items in batches of ${batchSize}`)
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(items.length / batchSize)
    
    console.log(`${context}: Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`)
    
    try {
      const batchResults = await Promise.all(
        batch.map(item => withRateLimit(() => processFn(item), `${context} - Item`))
      )
      
      results.push(...batchResults)
      
      // Small delay between batches to avoid overwhelming the API
      if (i + batchSize < items.length) {
        await sleep(100)
      }
    } catch (error) {
      console.error(`${context}: Batch ${batchNumber} failed:`, error)
      throw error
    }
  }
  
  console.log(`${context}: Completed processing ${items.length} items`)
  return results
}