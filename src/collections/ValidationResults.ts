import { CollectionConfig } from 'payload'

export const ValidationResults: CollectionConfig = {
  slug: 'validation-results',
  admin: {
    useAsTitle: 'jobType',
    defaultColumns: ['jobType', 'status', 'createdAt', 'totalDiscrepancies'],
    group: 'System',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => false,
    delete: () => true,
  },
  fields: [
    {
      name: 'jobType',
      type: 'select',
      required: true,
      options: [
        { label: 'Sync Teams', value: 'syncTeams' },
        { label: 'Sync Players', value: 'syncPlayers' },
        { label: 'Sync Matches', value: 'syncMatches' },
        { label: 'Sync Leagues', value: 'syncLeagues' },
        { label: 'Manual Validation', value: 'manual' },
      ],
    },
    {
      name: 'teamId',
      type: 'number',
      admin: {
        description: 'Team ID that was validated (if applicable)',
      },
    },
    {
      name: 'teamName',
      type: 'text',
    },
    {
      name: 'entity',
      type: 'select',
      required: true,
      options: [
        { label: 'Fixtures', value: 'fixtures' },
        { label: 'Teams', value: 'teams' },
        { label: 'Players', value: 'players' },
        { label: 'Standings', value: 'standings' },
        { label: 'Player Stats', value: 'playerstats' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pass', value: 'pass' },
        { label: 'Fail', value: 'fail' },
        { label: 'Error', value: 'error' },
        { label: 'Pending', value: 'pending' },
      ],
    },
    {
      name: 'totalDiscrepancies',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'comparisonSummary',
      type: 'json',
      admin: {
        description: 'Summary of comparison results',
      },
    },
    {
      name: 'discrepancies',
      type: 'json',
      admin: {
        description: 'Detailed discrepancy data',
      },
    },
    {
      name: 'syncRecommendations',
      type: 'json',
      admin: {
        description: 'Recommended sync jobs to fix discrepancies',
      },
    },
    {
      name: 'error',
      type: 'text',
      admin: {
        description: 'Error message if validation failed',
      },
    },
    {
      name: 'executionTime',
      type: 'number',
      admin: {
        description: 'Validation execution time in milliseconds',
      },
    },
  ],
  timestamps: true,
}
