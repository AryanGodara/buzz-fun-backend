import type { ICreator, ICreatorScore, IWaitlistEntry } from '../types'

/**
 * Simple in-memory data store to replace MongoDB
 * Note: Data will be lost on worker restart - this is for MVP only
 */
export class InMemoryStore {
  private creatorScores: Map<string, ICreatorScore> = new Map()
  private creators: Map<number, ICreator> = new Map()
  private waitlist: Map<string, IWaitlistEntry> = new Map()
  private scoresByFid: Map<number, string[]> = new Map() // FID -> score IDs

  /**
   * Creator Score operations
   */
  async saveCreatorScore(score: ICreatorScore): Promise<ICreatorScore> {
    const id = score._id || this.generateId()
    const savedScore = {
      ...score,
      _id: id,
      createdAt: score.createdAt || new Date(),
      updatedAt: new Date(),
    }

    this.creatorScores.set(id, savedScore)

    // Index by FID for efficient lookups
    const fidScores = this.scoresByFid.get(score.creatorFid) || []
    if (!fidScores.includes(id)) {
      fidScores.push(id)
      this.scoresByFid.set(score.creatorFid, fidScores)
    }

    return savedScore
  }

  async findCreatorScore(query: {
    creatorFid?: number
    shareableId?: string
    scoreDate?: { $gte: Date }
  }): Promise<ICreatorScore | null> {
    if (query.shareableId) {
      for (const score of this.creatorScores.values()) {
        if (score.shareableId === query.shareableId) {
          return score
        }
      }
      return null
    }

    if (query.creatorFid) {
      const fidScores = this.scoresByFid.get(query.creatorFid) || []

      for (const scoreId of fidScores.reverse()) {
        // Get most recent first
        const score = this.creatorScores.get(scoreId)
        if (!score) continue

        // Check date filter if provided
        if (query.scoreDate?.$gte) {
          if (score.scoreDate >= query.scoreDate.$gte) {
            return score
          }
        } else {
          return score
        }
      }
    }

    return null
  }

  async countCreatorScores(query: {
    scoreDate?: { $gte: Date }
    overallScore?: { $lt: number }
  }): Promise<number> {
    let count = 0

    for (const score of this.creatorScores.values()) {
      let matches = true

      if (query.scoreDate?.$gte && score.scoreDate < query.scoreDate.$gte) {
        matches = false
      }

      if (
        query.overallScore?.$lt &&
        score.overallScore >= query.overallScore.$lt
      ) {
        matches = false
      }

      if (matches) count++
    }

    return count
  }

  /**
   * Creator operations
   */
  async saveCreator(creator: ICreator): Promise<ICreator> {
    const savedCreator = {
      ...creator,
      _id: creator._id || this.generateId(),
      createdAt: creator.createdAt || new Date(),
      updatedAt: new Date(),
    }

    this.creators.set(creator.fid, savedCreator)
    return savedCreator
  }

  async findCreator(fid: number): Promise<ICreator | null> {
    return this.creators.get(fid) || null
  }

  /**
   * Waitlist operations
   */
  async saveWaitlistEntry(entry: IWaitlistEntry): Promise<IWaitlistEntry> {
    const id = entry._id || this.generateId()
    const savedEntry = {
      ...entry,
      _id: id,
      createdAt: entry.createdAt || new Date(),
      updatedAt: new Date(),
    }

    this.waitlist.set(id, savedEntry)
    return savedEntry
  }

  async findWaitlistEntry(fid: number): Promise<IWaitlistEntry | null> {
    for (const entry of this.waitlist.values()) {
      if (entry.fid === fid) {
        return entry
      }
    }
    return null
  }

  async getAllWaitlistEntries(): Promise<IWaitlistEntry[]> {
    return Array.from(this.waitlist.values())
  }

  /**
   * Leaderboard operations
   */
  async getTopScores(
    limit: number = 10,
    minDate?: Date,
  ): Promise<ICreatorScore[]> {
    const scores = Array.from(this.creatorScores.values())

    let filtered = scores
    if (minDate) {
      filtered = scores.filter((score) => score.scoreDate >= minDate)
    }

    return filtered
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit)
  }

  /**
   * Utility methods
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      creatorScores: this.creatorScores.size,
      creators: this.creators.size,
      waitlistEntries: this.waitlist.size,
    }
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.creatorScores.clear()
    this.creators.clear()
    this.waitlist.clear()
    this.scoresByFid.clear()
  }
}

// Export singleton instance
export const inMemoryStore = new InMemoryStore()
