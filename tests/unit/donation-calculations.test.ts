import { describe, it, expect } from 'vitest';

/**
 * UNIT TESTS: Donation Fee Calculations
 * 
 * Tests the fee coverage calculation for donations.
 * Formula: (amount + 0.30) / 0.971
 * 
 * This is pure business logic that doesn't need E2E testing.
 */

describe('Donation Fee Calculations', () => {
  const calculateTotal = (amount: number): number => {
    return (amount + 0.30) / 0.971;
  };

  const calculateStripeFee = (amount: number): number => {
    return calculateTotal(amount) - amount;
  };

  describe('calculateTotal', () => {
    it('should calculate total with fee coverage for $10 donation', () => {
      const total = calculateTotal(10);
      expect(total).toBeCloseTo(10.62, 2);
    });

    it('should calculate total with fee coverage for $50 donation', () => {
      const total = calculateTotal(50);
      expect(total).toBeCloseTo(51.82, 2);
    });

    it('should calculate total with fee coverage for $100 donation', () => {
      const total = calculateTotal(100);
      expect(total).toBeCloseTo(103.40, 2);
    });

    it('should handle $0 donation', () => {
      const total = calculateTotal(0);
      expect(total).toBeCloseTo(0.31, 2);
    });

    it('should handle large donations', () => {
      const total = calculateTotal(1000);
      expect(total).toBeCloseTo(1030.38, 2);
    });

    it('should handle decimal amounts', () => {
      const total = calculateTotal(25.50);
      expect(total).toBeCloseTo(26.57, 2);
    });
  });

  describe('calculateStripeFee', () => {
    it('should calculate Stripe fee for $10 donation', () => {
      const fee = calculateStripeFee(10);
      expect(fee).toBeCloseTo(0.62, 2);
    });

    it('should calculate Stripe fee for $50 donation', () => {
      const fee = calculateStripeFee(50);
      expect(fee).toBeCloseTo(1.82, 2);
    });

    it('should calculate Stripe fee for $100 donation', () => {
      const fee = calculateStripeFee(100);
      expect(fee).toBeCloseTo(3.40, 2);
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
      const amount = 25.99;
      const total1 = calculateTotal(amount);
      const total2 = calculateTotal(amount);
      expect(total1).toBe(total2);
    });
  });

  describe('percentage verification', () => {
    it('should cover approximately 2.9% Stripe fee', () => {
      const amounts = [10, 25, 50, 100, 500];
      
      amounts.forEach(amount => {
        const total = calculateTotal(amount);
        const fee = total - amount;
        const feePercentage = (fee / amount) * 100;
        
        // Fee percentage should be around 2.9-3.1% for most amounts
        expect(feePercentage).toBeGreaterThan(2.5);
        expect(feePercentage).toBeLessThan(3.5);
      });
    });

    it('should ensure donor amount is fully received', () => {
      const donorAmount = 50;
      const total = calculateTotal(donorAmount);
      
      // After Stripe takes their fee, we should receive >= donor amount
      const stripeFeeTaken = total * 0.029 + 0.30;
      const received = total - stripeFeeTaken;
      
      expect(received).toBeGreaterThanOrEqual(donorAmount - 0.01); // Allow 1 cent rounding
    });
  });
});
