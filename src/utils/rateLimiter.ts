/**
 * Simple in-memory rate limiter
 * Helps prevent exceeding API rate limits by throttling requests
 */
export class RateLimiter {
  private requestsPerMinute: number
  private queue: number[] = []

  /**
   * Create a new rate limiter
   * @param rpm Maximum requests per minute
   */
  constructor(rpm: number) {
    this.requestsPerMinute = rpm
  }

  /**
   * Wait until a request can be made without exceeding rate limit
   * @returns Promise that resolves when it's safe to make a request
   */
  async wait(): Promise<void> {
    const now = Date.now()
    const windowStart = now - 60000 // 1 minute ago

    // Clean old requests that fall outside the current window
    this.queue = this.queue.filter((time) => time > windowStart)

    // Check if we're at limit
    if (this.queue.length >= this.requestsPerMinute) {
      const oldestRequest = this.queue[0]
      const waitTime = 60000 - (now - oldestRequest) + 100 // Add 100ms buffer
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    // Add this request to queue
    this.queue.push(Date.now())
  }

  /**
   * Get the current request count in the window
   * @returns Number of requests in the last minute
   */
  getRequestCount(): number {
    const now = Date.now()
    const windowStart = now - 60000
    this.queue = this.queue.filter((time) => time > windowStart)
    return this.queue.length
  }

  /**
   * Reset the rate limiter queue
   */
  reset(): void {
    this.queue = []
  }
}
