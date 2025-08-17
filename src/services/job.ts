import { Creator } from '../models/creator'
import { CreatorScore, type IScoreComponents } from '../models/creatorScore'
import { type CreatorMetrics, neynarService } from './neynar'
import { notificationService } from './notification'
import { type ScoreResult, scoreCalculator } from './score'

/**
 * Interface for score calculation job data
 */
interface ScoreJobData {
  fid: number
  days?: number
  type?: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  priority: number
  createdAt: Date
  result?: ScoreResult
  error?: string
}

/**
 * Job Processor Service
 * Handles background jobs using in-memory queue (no Redis dependency)
 */
export class JobProcessor {
  private jobs: Map<string, ScoreJobData> = new Map()
  private isProcessing: boolean = false

  constructor() {
    // Schedule recurring jobs
    this.scheduleJobs()

    console.log('🟢 Job processor initialized (in-memory mode)')
  }

  /**
   * Schedule recurring jobs
   */
  private scheduleJobs(): void {
    // Calculate time until next 2 AM
    const now = new Date()
    const nextRun = new Date()
    nextRun.setHours(2, 0, 0, 0)

    // If it's already past 2 AM, schedule for tomorrow
    if (now.getHours() >= 2) {
      nextRun.setDate(nextRun.getDate() + 1)
    }

    const timeUntilNextRun = nextRun.getTime() - now.getTime()

    // First, schedule a one-time job for the next 2 AM
    setTimeout(() => {
      // Run the job immediately when we reach the target time
      this.runDailyJob()

      // Then set up the recurring daily job
      setInterval(this.runDailyJob.bind(this), 24 * 60 * 60 * 1000)
    }, timeUntilNextRun)

    console.log(`🗓️ Scheduled daily job to run at ${nextRun.toLocaleString()}`)
  }

  /**
   * Run the daily batch job
   */
  private async runDailyJob(): Promise<void> {
    console.log('⚙️ Running daily batch job')

    // For MVP, we can just queue a job for each creator
    // In a production system, we might want to handle this differently
    try {
      const creators = await Creator.find().select('fid')

      for (const creator of creators) {
        await this.queueScoreCalculation(creator.fid, 0)
      }

      console.log(`✅ Queued batch jobs for ${creators.length} creators`)
    } catch (error) {
      console.error('❌ Daily batch job failed:', error)
    }
  }

  /**
   * Queue a score calculation job
   * @param fid Farcaster ID
   * @param priority Job priority (0-100, higher is more important)
   * @returns Job ID
   */
  async queueScoreCalculation(fid: number, priority = 0): Promise<string> {
    // Generate a unique job ID
    const jobId = `job-${Date.now()}-${fid}`

    // Store job data
    this.jobs.set(jobId, {
      fid,
      days: 45,
      status: 'queued',
      priority,
      createdAt: new Date(),
    })

    console.log(`🔄 Queued job ${jobId} for FID ${fid}`)

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNextJob()
    }

    return jobId
  }

  /**
   * Process the next job in the queue
   */
  /**
   * Get all jobs (for testing/admin purposes)
   * @returns Array of job data with IDs
   */
  getJobs(): Array<{ id: string } & ScoreJobData> {
    return Array.from(this.jobs.entries()).map(([id, job]) => ({
      id,
      ...job,
    }))
  }

  private async processNextJob(): Promise<void> {
    this.isProcessing = true

    // Find highest priority job
    let nextJobId: string | null = null
    let highestPriority = -1

    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'queued' && job.priority > highestPriority) {
        nextJobId = id
        highestPriority = job.priority
      }
    }

    if (nextJobId) {
      const job = this.jobs.get(nextJobId)!

      // Update status
      job.status = 'processing'
      this.jobs.set(nextJobId, job)

      console.log(`⚙️ Processing job: ${nextJobId}`, job)

      try {
        // Get metrics from Neynar
        const metrics = await neynarService.getUserMetrics(job.fid, job.days)

        // Calculate score
        const score = await scoreCalculator.calculateScore(metrics)

        // Save to database
        await this.saveScore(score)

        // Update creator profile
        await this.updateCreatorProfile(metrics)

        // Send notifications
        await notificationService.sendScoreUpdateNotification(job.fid, score)

        // Mark as complete
        job.status = 'completed'
        job.result = score
        this.jobs.set(nextJobId, job)

        console.log(`✅ Job completed: ${nextJobId}`)
      } catch (error) {
        console.error(`❌ Job failed: ${nextJobId}`, error)
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : String(error)
        this.jobs.set(nextJobId, job)
      }

      // Process next job
      setTimeout(() => this.processNextJob(), 0)
    } else {
      this.isProcessing = false
      console.log('✅ Queue empty, processing paused')
    }
  }

  /**
   * Save a score to the database
   * @param score Score data
   * @returns ID of saved score
   */
  private async saveScore(score: ScoreResult): Promise<string> {
    // Create components object that matches the IScoreComponents interface
    const componentData: IScoreComponents = {
      engagement: score.components.engagement || 0,
      consistency: score.components.consistency || 0,
      growth: score.components.growth || 0,
      quality: score.components.quality || 0,
      network: score.components.network || 0,
      ...score.components, // Include any other components that might be in the record
    }
    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate valid until date (tomorrow)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find existing score or create new one
    const existingScore = await CreatorScore.findOne({
      creatorFid: score.fid,
      scoreDate: { $gte: today },
    })

    if (existingScore) {
      // Update existing score
      existingScore.overallScore = score.overallScore
      existingScore.percentileRank = score.percentileRank
      existingScore.tier = score.tier
      existingScore.components = componentData
      existingScore.validUntil = score.validUntil
      await existingScore.save()
      return existingScore.id
    } else {
      // Create new score
      const newScore = new CreatorScore({
        creatorFid: score.fid,
        overallScore: score.overallScore,
        percentileRank: score.percentileRank,
        tier: score.tier,
        components: componentData,
        scoreDate: today,
        validUntil: tomorrow,
      })
      await newScore.save()
      return newScore.id
    }
  }

  /**
   * Update or create creator profile
   * @param metrics Creator metrics
   */
  private async updateCreatorProfile(metrics: CreatorMetrics): Promise<void> {
    // Create properly typed creator data
    const creatorData = {
      username: metrics.username,
      followerCount: metrics.followerCount,
      followingCount: metrics.followingCount,
      powerBadge: metrics.powerBadge,
      neynarScore: metrics.neynarScore,
    }

    await Creator.findOneAndUpdate({ fid: metrics.fid }, creatorData, {
      upsert: true,
      new: true,
    })
  }
}

// Export singleton instance
export const jobProcessor = new JobProcessor()
