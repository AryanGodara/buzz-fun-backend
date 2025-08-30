import type { ICreatorScore } from '../types'
import { inMemoryStore } from '../utils/inMemoryStore'
import { createNeynarService } from './neynar'
import { scoreCalculator } from './score'

/**
 * Job status enum
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Job interface
 */
export interface Job {
  id: string
  type: 'score_calculation'
  fid: number
  priority: number
  status: JobStatus
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

/**
 * Simple in-memory job processor for Cloudflare Workers
 * Handles score calculation jobs without external queue dependencies
 */
export class JobProcessor {
  private jobs: Map<string, Job> = new Map()
  private processing: Set<string> = new Set()
  private apiKey: string | undefined

  /**
   * Queue a score calculation job
   * @param fid Farcaster ID
   * @param priority Job priority (higher = more urgent)
   * @returns Job ID
   */
  async queueScoreCalculation(
    fid: number,
    priority: number = 5,
  ): Promise<string> {
    const jobId = this.generateJobId()

    const job: Job = {
      id: jobId,
      type: 'score_calculation',
      fid,
      priority,
      status: JobStatus.PENDING,
      createdAt: new Date(),
    }

    this.jobs.set(jobId, job)

    // Process immediately in Cloudflare Workers (no background processing)
    this.processJob(jobId).catch((error) => {
      console.error(`Job ${jobId} failed:`, error)
      const failedJob = this.jobs.get(jobId)
      if (failedJob) {
        failedJob.status = JobStatus.FAILED
        failedJob.error = error.message
        failedJob.completedAt = new Date()
      }
    })

    return jobId
  }

  /**
   * Process a specific job
   * @param jobId Job ID to process
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job || this.processing.has(jobId)) {
      return
    }

    this.processing.add(jobId)
    job.status = JobStatus.PROCESSING
    job.startedAt = new Date()

    try {
      if (job.type === 'score_calculation') {
        await this.processScoreCalculation(job.fid)
      }

      job.status = JobStatus.COMPLETED
      job.completedAt = new Date()
    } catch (error) {
      job.status = JobStatus.FAILED
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.completedAt = new Date()
      throw error
    } finally {
      this.processing.delete(jobId)
    }
  }

  /**
   * Process score calculation for a creator
   * @param fid Farcaster ID
   */
  private async processScoreCalculation(fid: number): Promise<void> {
    // Check if we already have a recent score
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingScore = await inMemoryStore.findCreatorScore({
      creatorFid: fid,
      scoreDate: { $gte: today },
    })

    if (existingScore) {
      console.log(`Score already exists for FID ${fid}`)
      return
    }

    // Check if API key is available
    if (!this.apiKey) {
      throw new Error('NEYNAR_API_KEY not available in job processor')
    }

    const neynarService = createNeynarService(this.apiKey)

    // Get creator metrics from Neynar
    const metrics = await neynarService.getCreatorMetrics(fid)
    if (!metrics) {
      throw new Error(`Failed to fetch metrics for FID ${fid}`)
    }

    // Calculate score
    const scoreResult = await scoreCalculator.calculateScore(metrics)

    // Save creator info
    await inMemoryStore.saveCreator({
      fid: metrics.fid,
      username: metrics.username,
      followerCount: metrics.followerCount,
      followingCount: metrics.followingCount,
      powerBadge: metrics.powerBadge,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Save score
    const creatorScore: ICreatorScore = {
      shareableId: this.generateShareableId(),
      creatorFid: scoreResult.fid,
      overallScore: scoreResult.overallScore,
      percentileRank: scoreResult.percentileRank,
      tier: scoreResult.tier,
      components: scoreResult.components,
      scoreDate: today,
      validUntil: scoreResult.validUntil,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await inMemoryStore.saveCreatorScore(creatorScore)

    console.log(`Score calculated for FID ${fid}: ${scoreResult.overallScore}`)
  }

  /**
   * Get job status
   * @param jobId Job ID
   * @returns Job or null if not found
   */
  getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) || null
  }

  /**
   * Get all jobs (for debugging)
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Clear completed jobs older than specified time
   * @param olderThanMs Age in milliseconds
   */
  cleanupJobs(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThanMs

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === JobStatus.COMPLETED ||
          job.status === JobStatus.FAILED) &&
        job.createdAt.getTime() < cutoff
      ) {
        this.jobs.delete(jobId)
      }
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate shareable ID for scores
   */
  private generateShareableId(): string {
    return Math.random().toString(36).substr(2, 12)
  }

  /**
   * Set API key for job processing (called from route handlers)
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }
}

// Export singleton instance
export const jobProcessor = new JobProcessor()
