export type PlayerTab = 'overview' | 'stats' | 'career'

export type PlayerBase = {
  id: string
  name: string
  position?: string
  nationality?: string
  team?: {
    id: string
    name: string
  }
  photo?: string
  jersey_number?: number
  date_of_birth?: string
  height?: string // e.g., "185 cm"
  weight?: string // e.g., "80 kg"
  foot?: 'left' | 'right' | 'both'
}

export type PlayerCareerItem = {
  team: {
    id: string
    name: string
    logo?: string
  }
  league: {
    id: string
    name: string
    country?: string
  }
  season: {
    id: string
    name: string
  }
  start_date?: string
  end_date?: string
  appearances?: number
  goals?: number
  assists?: number
  minutes_played?: number
}

export type PlayerSeasonStats = {
  season: {
    id: string
    name: string
  }
  team: {
    id: string
    name: string
    logo?: string
  }
  league: {
    id: string
    name: string
  }
  appearances: number
  minutes_played: number
  goals?: number
  assists?: number
  yellow_cards?: number
  red_cards?: number
  shots?: {
    total: number
    on_target: number
    accuracy: number
  }
  passes?: {
    total: number
    key: number
    accuracy: number
  }
  dribbles?: {
    attempts: number
    success: number
    success_rate: number
  }
  rating?: number
}

// Response types for each player endpoint
export type PlayerOverviewResponse = PlayerBase & {
  description?: string
  current_team_stats?: PlayerSeasonStats
}

export type PlayerStatsResponse = PlayerBase & {
  stats: PlayerSeasonStats[]
  seasons: {
    id: string
    name: string
  }[]
}

export type PlayerCareerResponse = PlayerBase & {
  career: PlayerCareerItem[]
}

// Response type for players list
export type PlayersListResponse = {
  data: PlayerBase[]
  meta: {
    pagination: {
      page: number
      limit: number
      totalItems: number
      totalPages: number
    }
  }
}

// Data fetcher type for player operations
export type PlayerDataFetcher = {
  getOverview: (playerId: string) => Promise<PlayerOverviewResponse>
  getStats: (playerId: string, seasonId?: string) => Promise<PlayerStatsResponse>
  getCareer: (playerId: string) => Promise<PlayerCareerResponse>
}

// Data fetcher type for players list
export type PlayerListDataFetcher = {
  getPlayers: (options: {
    page: number
    limit: number
    teamId?: string
    countryId?: string
    position?: string
    search?: string
  }) => Promise<PlayersListResponse>
}
