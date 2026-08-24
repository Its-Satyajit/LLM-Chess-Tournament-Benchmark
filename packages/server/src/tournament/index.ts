import { randomBytes } from 'crypto'
import type { MatchEngine } from '../game/MatchEngine'
import type { ModelConfig } from '@llm-chess-arena/shared'
import type { Rating} from '../evaluation';
import { createInitialRating, updateRating, glickoToDisplay } from '../evaluation'

export interface TournamentConfig {
  name: string
  format: 'round_robin' | 'swiss' | 'knockout'
  models: {
    name: string
    provider: string
    config: ModelConfig
  }[]
}

export interface Tournament {
  id: string
  name: string
  format: string
  status: 'pending' | 'active' | 'completed'
  models: {
    name: string
    provider: string
    config: ModelConfig
    rating: Rating
  }[]
  pairings: {
    id: string
    modelAIndex: number
    modelBIndex: number
    matchId?: string
    status: 'pending' | 'active' | 'completed'
    result?: {
      modelAWins: number
      modelBWins: number
      draws: number
    }
  }[]
  createdAt: Date
  completedAt?: Date
}

export class TournamentManager {
  private tournaments = new Map<string, Tournament>()
  private engine: MatchEngine

  constructor(engine: MatchEngine) {
    this.engine = engine
  }

  createTournament(config: TournamentConfig): Tournament {
    const id = `TOURN-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,

     models = config.models.map(m => ({
      ...m,
      rating: createInitialRating(),
    })),

    // Generate round-robin pairings
     pairings: Tournament['pairings'] = []
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        pairings.push({
          id: `PAIR-${id}-${i}-${j}`,
          modelAIndex: i,
          modelBIndex: j,
          status: 'pending',
        })
      }
    }

    const tournament: Tournament = {
      createdAt: new Date(),
      format: config.format,
      id,
      models,
      name: config.name,
      pairings,
      status: 'active',
    }

    this.tournaments.set(id, tournament)
    return tournament
  }

  getTournament(id: string): Tournament | undefined {
    return this.tournaments.get(id)
  }

  listTournaments(): Tournament[] {
    return [...this.tournaments.values()]
  }

  startPairing(tournamentId: string): { matchId: string; playerAId: string; playerBId: string } | null {
    const tournament = this.tournaments.get(tournamentId)
    if (!tournament) {return null}

    // Find first pending pairing
    const pairing = tournament.pairings.find(p => p.status === 'pending')
    if (!pairing) {return null}

    const modelA = tournament.models[pairing.modelAIndex],
     modelB = tournament.models[pairing.modelBIndex],

    // Create match
     match = this.engine.createMatch({
      boardMode: 'assisted',
      playerAModel: modelA.config,
      playerBModel: modelB.config,
      startingPosition: 'standard',
      timeControl: '10+5',
    })

    pairing.matchId = match.id
    pairing.status = 'active'

    return {
      matchId: match.id,
      playerAId: match.playerAId,
      playerBId: match.playerBId,
    }
  }

  completePairing(tournamentId: string, pairingId: string, result: { modelAWins: number; modelBWins: number; draws: number }): void {
    const tournament = this.tournaments.get(tournamentId)
    if (!tournament) {return}

    const pairing = tournament.pairings.find(p => p.id === pairingId)
    if (!pairing) {return}

    pairing.result = result
    pairing.status = 'completed'

    // Update ratings
    const modelA = tournament.models[pairing.modelAIndex],
     modelB = tournament.models[pairing.modelBIndex],

     totalGames = result.modelAWins + result.modelBWins + result.draws
    if (totalGames > 0) {
      const scoreA = (result.modelAWins + result.draws * 0.5) / totalGames,
       scoreB = (result.modelBWins + result.draws * 0.5) / totalGames

      modelA.rating = updateRating(modelA.rating, [{
        rating: modelB.rating.rating,
        rd: modelB.rating.rd,
        score: scoreA,
      }])

      modelB.rating = updateRating(modelB.rating, [{
        rating: modelA.rating.rating,
        rd: modelA.rating.rd,
        score: scoreB,
      }])
    }

    // Check if tournament is complete
    const allCompleted = tournament.pairings.every(p => p.status === 'completed')
    if (allCompleted) {
      tournament.status = 'completed'
      tournament.completedAt = new Date()
    }
  }

  getStandings(tournamentId: string): {
    model: string
    provider: string
    rating: number
    rd: number
    wins: number
    draws: number
    losses: number
    points: number
  }[] {
    const tournament = this.tournaments.get(tournamentId)
    if (!tournament) {return []}

    return tournament.models.map((m, i) => {
      let wins = 0,
       draws = 0,
       losses = 0

      for (const pairing of tournament.pairings) {
        if (!pairing.result) {continue}

        if (pairing.modelAIndex === i) {
          wins += pairing.result.modelAWins
          draws += pairing.result.draws
          losses += pairing.result.modelBWins
        } else if (pairing.modelBIndex === i) {
          wins += pairing.result.modelBWins
          draws += pairing.result.draws
          losses += pairing.result.modelAWins
        }
      }

      return {
        draws,
        losses,
        model: m.name,
        points: wins + draws * 0.5,
        provider: m.provider,
        rating: glickoToDisplay(m.rating.rating),
        rd: m.rating.rd,
        wins,
      }
    }).sort((a, b) => b.points - a.points)
  }
}
