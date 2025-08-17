/**
 * Interface for tier benefits
 */
interface TierBenefit {
  rate: number
  maxAmount: number
  gracePeriod: number
  name: string
}

/**
 * Interface for loan terms
 */
export interface LoanTerms {
  interestRate: number
  maxAmount: number
  gracePeriod: number
  tier: number
  benefits: string[]
}

/**
 * Loan Terms Calculator
 * Calculates loan terms based on creator score tier
 */
export class LoanTermsCalculator {
  // Benefits by tier
  private tierBenefits: Record<number, TierBenefit> = {
    1: { rate: 0.15, maxAmount: 1000, gracePeriod: 14, name: 'Starter' },
    2: { rate: 0.13, maxAmount: 2500, gracePeriod: 21, name: 'Bronze' },
    3: { rate: 0.11, maxAmount: 5000, gracePeriod: 30, name: 'Silver' },
    4: { rate: 0.095, maxAmount: 7500, gracePeriod: 30, name: 'Gold' },
    5: { rate: 0.08, maxAmount: 10000, gracePeriod: 45, name: 'Platinum' },
    6: { rate: 0.065, maxAmount: 15000, gracePeriod: 60, name: 'Diamond' },
  }

  /**
   * Calculate loan terms for a creator based on score
   * @param score Creator score
   * @returns Loan terms
   */
  calculateTerms(score: {
    tier: number
    components: Record<string, number>
  }): LoanTerms {
    const tierInfo = this.tierBenefits[score.tier] || this.tierBenefits[1]

    // Additional adjustments based on component scores
    let rateAdjustment = 0
    const benefits: string[] = [
      `${tierInfo.name} Tier Benefits`,
      `Base rate: ${(tierInfo.rate * 100).toFixed(1)}% APR`,
    ]

    // Consistency bonus
    if (score.components.consistency > 80) {
      rateAdjustment -= 0.005
      benefits.push('Consistency bonus: -0.5% APR')
    }

    // Engagement bonus
    if (score.components.engagement > 85) {
      rateAdjustment -= 0.01
      benefits.push('High engagement bonus: -1% APR')
    }

    // Network effect bonus
    if (score.components.network > 90) {
      rateAdjustment -= 0.005
      benefits.push('Network influence bonus: -0.5% APR')
    }

    // Ensure we don't go below minimum rate
    const finalRate = Math.max(0.05, tierInfo.rate + rateAdjustment)

    return {
      interestRate: finalRate,
      maxAmount: tierInfo.maxAmount,
      gracePeriod: tierInfo.gracePeriod,
      tier: score.tier,
      benefits,
    }
  }
}

// Export singleton instance
export const loanCalculator = new LoanTermsCalculator()
