import { describe, it, expect } from 'vitest';

/**
 * UNIT TESTS: Sponsorship Fee Calculations
 * 
 * Tests the fee coverage calculation for sponsorships.
 * Formula: (amount + 0.30) / 0.971
 * 
 * This is pure business logic that doesn't need E2E testing.
 * CRITICAL: All sponsorship amounts stored in the database must include fees
 * when coverStripeFee=true to accurately reflect total revenue received.
 */

describe('Sponsorship Fee Calculations', () => {
  const calculateTotal = (amount: number): number => {
    return (amount + 0.30) / 0.971;
  };

  const calculateStripeFee = (amount: number): number => {
    return calculateTotal(amount) - amount;
  };

  describe('calculateTotal - sponsorship amounts', () => {
    it('should calculate total with fee coverage for $25 sponsorship', () => {
      const total = calculateTotal(25);
      expect(total).toBeCloseTo(26.06, 2);
    });

    it('should calculate total with fee coverage for $50 sponsorship', () => {
      const total = calculateTotal(50);
      expect(total).toBeCloseTo(51.82, 2);
    });

    it('should calculate total with fee coverage for $100 sponsorship', () => {
      const total = calculateTotal(100);
      expect(total).toBeCloseTo(103.40, 2);
    });

    it('should calculate total with fee coverage for $1275 sponsorship', () => {
      const total = calculateTotal(1275);
      expect(total).toBeCloseTo(1313.39, 2);
    });

    it('should handle $0 sponsorship', () => {
      const total = calculateTotal(0);
      expect(total).toBeCloseTo(0.31, 2);
    });

    it('should handle large sponsorships', () => {
      const total = calculateTotal(5000);
      expect(total).toBeCloseTo(5149.54, 2);
    });

    it('should handle decimal amounts', () => {
      const total = calculateTotal(25.50);
      expect(total).toBeCloseTo(26.57, 2);
    });
  });

  describe('calculateStripeFee - sponsorship fees', () => {
    it('should calculate Stripe fee for $25 sponsorship', () => {
      const fee = calculateStripeFee(25);
      expect(fee).toBeCloseTo(1.06, 2);
    });

    it('should calculate Stripe fee for $50 sponsorship', () => {
      const fee = calculateStripeFee(50);
      expect(fee).toBeCloseTo(1.82, 2);
    });

    it('should calculate Stripe fee for $100 sponsorship', () => {
      const fee = calculateStripeFee(100);
      expect(fee).toBeCloseTo(3.40, 2);
    });

    it('should calculate Stripe fee for $1275 sponsorship', () => {
      const fee = calculateStripeFee(1275);
      expect(fee).toBeCloseTo(38.39, 2);
    });

    it('should verify fee is approximately 2.9% + $0.30', () => {
      const amount = 100;
      const fee = calculateStripeFee(amount);
      const expectedFee = (amount * 0.029) + 0.30;
      // Fee should be close to Stripe's 2.9% + $0.30
      expect(fee).toBeCloseTo(expectedFee, 1);
    });
  });

  describe('edge cases', () => {
    it('should handle very small amounts', () => {
      const total = calculateTotal(0.01);
      expect(total).toBeGreaterThan(0.01);
      expect(total).toBeCloseTo(0.32, 2);
    });

    it('should handle negative amounts gracefully', () => {
      const total = calculateTotal(-10);
      // Even with negative input, formula should still work
      expect(total).toBeCloseTo(-9.70, 2);
    });

    it('should maintain precision for repeated calculations', () => {
      const amount = 1275;
      const total1 = calculateTotal(amount);
      const total2 = calculateTotal(amount);
      expect(total1).toBe(total2);
      expect(total1).toBeCloseTo(1313.39, 2);
    });
  });

  describe('percentage verification', () => {
    it('should cover approximately 2.9% Stripe fee', () => {
      const amounts = [25, 50, 100, 500, 1000, 1275];
      
      amounts.forEach(amount => {
        const total = calculateTotal(amount);
        const fee = total - amount;
        const feePercentage = (fee / amount) * 100;
        
        // Fee percentage should be around 2.9-3.1% for most amounts
        expect(feePercentage).toBeGreaterThan(2.5);
        expect(feePercentage).toBeLessThan(7);
      });
    });

    it('should ensure sponsor amount is fully received', () => {
      const sponsorAmount = 1275;
      const total = calculateTotal(sponsorAmount);
      
      // After Stripe takes their fee, we should receive >= sponsor amount
      const stripeFeeTaken = total * 0.029 + 0.30;
      const received = total - stripeFeeTaken;
      
      expect(received).toBeGreaterThanOrEqual(sponsorAmount - 0.01); // Allow 1 cent rounding
      expect(total).toBeCloseTo(1313.39, 2);
    });

    it('should verify common sponsorship tiers', () => {
      const commonTiers = [
        { base: 25, expected: 26.06 },
        { base: 50, expected: 51.82 },
        { base: 75, expected: 77.58 },
        { base: 100, expected: 103.40 },
        { base: 200, expected: 206.49 },
        { base: 500, expected: 515.76 },
        { base: 1000, expected: 1030.38 },
      ];

      commonTiers.forEach(({ base, expected }) => {
        const total = calculateTotal(base);
        expect(total).toBeCloseTo(expected, 2);
      });
    });
  });

  describe('database storage requirements', () => {
    it('should store full amount for $1275 base with fee coverage', () => {
      const baseAmount = 1275;
      const fullAmount = calculateTotal(baseAmount);
      
      // This is what should be stored in the database
      expect(fullAmount).toBeCloseTo(1313.39, 2);
      
      // NOT the base amount
      expect(fullAmount).not.toBe(baseAmount);
      expect(fullAmount).toBeGreaterThan(baseAmount);
    });

    it('should calculate difference between stored amounts', () => {
      const incorrectStoredAmount = 1275.00;
      const correctStoredAmount = 1313.39;
      
      const difference = correctStoredAmount - incorrectStoredAmount;
      expect(difference).toBeCloseTo(38.39, 2);
    });
  });
});
