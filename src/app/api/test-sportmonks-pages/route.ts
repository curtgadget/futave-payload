import { NextResponse } from 'next/server'
import { SPORTMONKS_FOOTBALL_BASE_URL } from '@/constants/api'

export async function GET() {
  try {
    const apiKey = process.env.SPORTMONKS_API_KEY || ''
    const baseUrl = process.env.SPORTMONKS_BASE_URL || SPORTMONKS_FOOTBALL_BASE_URL

    // Fetch first page of players
    const page1Response = await fetch(`${baseUrl}/players?api_token=${apiKey}&page=1`)

    if (!page1Response.ok) {
      throw new Error(`API error: ${page1Response.status} ${page1Response.statusText}`)
    }

    const page1Data = await page1Response.json()
    const nextPageUrl = page1Data.pagination?.next_page

    if (!nextPageUrl) {
      return NextResponse.json({
        success: false,
        error: 'No next page URL available',
        page1Count: page1Data.data?.length || 0,
      })
    }

    // Extract page number from next_page URL
    const nextPageUrlObj = new URL(nextPageUrl)
    const pageParam = nextPageUrlObj.searchParams.get('page')

    // Manually construct second page URL with API token
    const page2Response = await fetch(`${baseUrl}/players?api_token=${apiKey}&page=${pageParam}`)

    if (!page2Response.ok) {
      throw new Error(`API error on page 2: ${page2Response.status} ${page2Response.statusText}`)
    }

    const page2Data = await page2Response.json()

    // Check if player IDs are different between pages
    const page1Ids = page1Data.data?.map((player: any) => player.id) || []
    const page2Ids = page2Data.data?.map((player: any) => player.id) || []

    // Find any IDs that appear in both pages (should be none if pages are distinct)
    const duplicateIds = page1Ids.filter((id: number) => page2Ids.includes(id))

    return NextResponse.json({
      success: true,
      page1: {
        count: page1Ids.length,
        ids: page1Ids,
        pagination: page1Data.pagination,
      },
      page2: {
        count: page2Ids.length,
        ids: page2Ids,
        pagination: page2Data.pagination,
      },
      comparison: {
        hasDuplicates: duplicateIds.length > 0,
        duplicateIds,
        nextPageWorking: page1Ids.length > 0 && page2Ids.length > 0 && duplicateIds.length === 0,
      },
    })
  } catch (error) {
    console.error('Error testing Sportmonks pagination:', error)
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
