import { describe, expect, it } from 'vitest'
import { events, games, matches, ratings, tournamentEntries, tournaments } from './schema'

describe('Database Schema', () => {
  describe('matches table', () => {
    it('should have correct column names', () => {
      const columns = Object.keys(matches)
      expect(columns).toContain('id')
      expect(columns).toContain('playerAId')
      expect(columns).toContain('playerBId')
      expect(columns).toContain('status')
      expect(columns).toContain('timeControl')
      expect(columns).toContain('startingPosition')
      expect(columns).toContain('boardMode')
      expect(columns).toContain('createdAt')
    })
  })

  describe('games table', () => {
    it('should have correct column names', () => {
      const columns = Object.keys(games)
      expect(columns).toContain('id')
      expect(columns).toContain('matchId')
      expect(columns).toContain('gameNumber')
      expect(columns).toContain('whitePlayerId')
      expect(columns).toContain('blackPlayerId')
      expect(columns).toContain('status')
      expect(columns).toContain('result')
      expect(columns).toContain('fenInitial')
      expect(columns).toContain('moveCount')
      expect(columns).toContain('createdAt')
    })
  })

  describe('events table', () => {
    it('should have correct column names', () => {
      const columns = Object.keys(events)
      expect(columns).toContain('id')
      expect(columns).toContain('gameId')
      expect(columns).toContain('eventType')
      expect(columns).toContain('playerId')
      expect(columns).toContain('data')
      expect(columns).toContain('timestamp')
    })
  })

  describe('ratings table', () => {
    it('should have correct column names', () => {
      const columns = Object.keys(ratings)
      expect(columns).toContain('modelName')
      expect(columns).toContain('provider')
      expect(columns).toContain('glickoRating')
      expect(columns).toContain('glickoRd')
      expect(columns).toContain('glickoVolatility')
      expect(columns).toContain('gamesPlayed')
      expect(columns).toContain('lastUpdated')
    })
  })

  describe('tournaments table', () => {
    it('should have correct column names', () => {
      const columns = Object.keys(tournaments)
      expect(columns).toContain('id')
      expect(columns).toContain('name')
      expect(columns).toContain('format')
      expect(columns).toContain('status')
      expect(columns).toContain('createdAt')
    })
  })

  describe('tournamentEntries table', () => {
    it('should have correct column names', () => {
      const columns = Object.keys(tournamentEntries)
      expect(columns).toContain('id')
      expect(columns).toContain('tournamentId')
      expect(columns).toContain('modelName')
      expect(columns).toContain('provider')
      expect(columns).toContain('wins')
      expect(columns).toContain('draws')
      expect(columns).toContain('losses')
      expect(columns).toContain('points')
    })
  })
})
