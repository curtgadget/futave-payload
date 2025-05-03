import { NextResponse } from 'next/server'
import { createSportmonksClient } from '@/services/sportmonks/client'
import { SPORTMONKS_FOOTBALL_BASE_URL } from '@/constants/api'

export async function GET() {
  try {
    const client = createSportmonksClient({
      apiKey: process.env.SPORTMONKS_API_KEY || '',
      baseUrl: process.env.SPORTMONKS_BASE_URL || SPORTMONKS_FOOTBALL_BASE_URL,
      concurrencyLimit: 3,
    })

    console.log('Using base URL:', process.env.SPORTMONKS_BASE_URL || SPORTMONKS_FOOTBALL_BASE_URL)

    const endpoint = '/players'
    console.log('Testing endpoint:', endpoint)

    const defaultPageTest = await client.fetchFromApi(endpoint, { page: 1 })
    const largePageTest = await client.fetchFromApi(endpoint, { page: 1, per_page: 100 })

    const defaultPagination = defaultPageTest.pagination || {}
    const largePagination = largePageTest.pagination || {}

    return NextResponse.json({
      success: true,
      defaultPageSize: {
        dataCount: Array.isArray(defaultPageTest.data)
          ? defaultPageTest.data.length
          : 'not an array',
        pagination: defaultPagination,
      },
      largePageSize: {
        dataCount: Array.isArray(largePageTest.data) ? largePageTest.data.length : 'not an array',
        pagination: largePagination,
      },
      responseStructure: {
        defaultPageTestKeys: Object.keys(defaultPageTest),
        largePageTestKeys: Object.keys(largePageTest),
      },
    })
  } catch (error) {
    console.error('Error testing Sportmonks API:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
