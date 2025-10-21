import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobType = searchParams.get('jobType')
    const status = searchParams.get('status')
    const teamId = searchParams.get('teamId')
    const entity = searchParams.get('entity')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)

    const payload = await getPayload({ config })

    // Build query filters
    const where: any = {}

    if (jobType) {
      where.jobType = { equals: jobType }
    }

    if (status) {
      where.status = { equals: status }
    }

    if (teamId) {
      where.teamId = { equals: parseInt(teamId, 10) }
    }

    if (entity) {
      where.entity = { equals: entity }
    }

    // Fetch validation results
    const results = await payload.find({
      collection: 'validation-results',
      where: Object.keys(where).length > 0 ? where : undefined,
      limit,
      page,
      sort: '-createdAt',
    })

    // Calculate summary statistics
    const summary = {
      total: results.totalDocs,
      byStatus: {
        pass: 0,
        fail: 0,
        error: 0,
      },
      byJobType: {} as Record<string, number>,
      recentFailures: results.docs
        .filter((doc: any) => doc.status === 'fail')
        .slice(0, 5)
        .map((doc: any) => ({
          id: doc.id,
          jobType: doc.jobType,
          teamName: doc.teamName,
          entity: doc.entity,
          totalDiscrepancies: doc.totalDiscrepancies,
          createdAt: doc.createdAt,
        })),
    }

    // Count by status and job type
    results.docs.forEach((doc: any) => {
      if (doc.status) {
        summary.byStatus[doc.status as keyof typeof summary.byStatus]++
      }
      if (doc.jobType) {
        summary.byJobType[doc.jobType] = (summary.byJobType[doc.jobType] || 0) + 1
      }
    })

    return NextResponse.json({
      validations: results.docs,
      pagination: {
        page: results.page,
        limit: results.limit,
        totalPages: results.totalPages,
        totalDocs: results.totalDocs,
        hasNextPage: results.hasNextPage,
        hasPrevPage: results.hasPrevPage,
      },
      summary,
      filters: {
        jobType: jobType || 'all',
        status: status || 'all',
        teamId: teamId || 'all',
        entity: entity || 'all',
      },
    })
  } catch (error) {
    console.error('Error fetching validation history:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch validation history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
