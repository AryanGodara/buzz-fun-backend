import type { ICreatorScore } from '../types'

/**
 * Interface for loan terms
 */
export interface LoanTerms {
  maxAmount: number
  interestRate: number
  termMonths: number
  monthlyPayment: number
  creditScore: number
  riskTier: string
}

/**
 * Loan Calculator Service
 * Calculates loan terms based on creator scores
 */
export class LoanCalculator {
  /**
   * Calculate loan terms based on creator score
   * @param score Creator score data
   * @returns Loan terms
   */
  calculateTerms(score: ICreatorScore): LoanTerms {
    const { overallScore, tier } = score

    // Base loan amount calculation
    const maxAmount = this.calculateMaxAmount(overallScore, tier)

    // Interest rate based on score and tier
    const interestRate = this.calculateInterestRate(overallScore, tier)

    // Term length based on risk assessment
    const termMonths = this.calculateTermMonths(tier)

    // Calculate monthly payment
    const monthlyPayment = this.calculateMonthlyPayment(
      maxAmount,
      interestRate,
      termMonths,
    )

    // Map to traditional credit score for display
    const creditScore = this.mapToCreditScore(overallScore)

    // Risk tier description
    const riskTier = this.getRiskTier(tier)

    return {
      maxAmount,
      interestRate,
      termMonths,
      monthlyPayment,
      creditScore,
      riskTier,
    }
  }

  /**
   * Calculate maximum loan amount based on score and tier
   */
  private calculateMaxAmount(score: number, tier: number): number {
    const baseAmounts = {
      1: 1000, // Starter
      2: 2500, // Bronze
      3: 5000, // Silver
      4: 10000, // Gold
      5: 25000, // Platinum
      6: 50000, // Diamond
    }

    const baseAmount = baseAmounts[tier as keyof typeof baseAmounts] || 1000

    // Apply score multiplier within tier
    const scoreMultiplier = 1 + (score - (tier - 1) * 20) / 100

    return Math.round(baseAmount * scoreMultiplier)
  }

  /**
   * Calculate interest rate based on score and tier
   */
  private calculateInterestRate(score: number, tier: number): number {
    const baseRates = {
      1: 18.0, // Starter - High risk
      2: 15.0, // Bronze
      3: 12.0, // Silver
      4: 9.0, // Gold
      5: 6.0, // Platinum
      6: 4.5, // Diamond - Low risk
    }

    const baseRate = baseRates[tier as keyof typeof baseRates] || 18.0

    // Adjust rate based on score within tier
    const scoreAdjustment = (100 - score) * 0.05

    return Math.max(3.0, Math.round((baseRate + scoreAdjustment) * 10) / 10)
  }

  /**
   * Calculate loan term in months
   */
  private calculateTermMonths(tier: number): number {
    const termOptions = {
      1: 12, // Starter - Short term
      2: 18, // Bronze
      3: 24, // Silver
      4: 36, // Gold
      5: 48, // Platinum
      6: 60, // Diamond - Long term
    }

    return termOptions[tier as keyof typeof termOptions] || 12
  }

  /**
   * Calculate monthly payment using loan formula
   */
  private calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    termMonths: number,
  ): number {
    const monthlyRate = annualRate / 100 / 12

    if (monthlyRate === 0) {
      return principal / termMonths
    }

    const payment =
      (principal * (monthlyRate * (1 + monthlyRate) ** termMonths)) /
      ((1 + monthlyRate) ** termMonths - 1)

    return Math.round(payment * 100) / 100
  }

  /**
   * Map creator score to traditional credit score range
   */
  private mapToCreditScore(score: number): number {
    // Map 0-100 creator score to 300-850 credit score range
    const minCredit = 300
    const maxCredit = 850
    const range = maxCredit - minCredit

    const mappedScore = minCredit + (score / 100) * range
    return Math.round(mappedScore)
  }

  /**
   * Get risk tier description
   */
  private getRiskTier(tier: number): string {
    const riskTiers = {
      1: 'High Risk',
      2: 'Moderate-High Risk',
      3: 'Moderate Risk',
      4: 'Moderate-Low Risk',
      5: 'Low Risk',
      6: 'Very Low Risk',
    }

    return riskTiers[tier as keyof typeof riskTiers] || 'High Risk'
  }
}

// Export singleton instance
export const loanCalculator = new LoanCalculator()
