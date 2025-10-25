import { describe, it, expect } from 'vitest';

/**
 * Shopping Cart Math Unit Tests
 * Testing pure calculation functions for cart totals, tax, shipping, and discounts
 */

describe('Shopping Cart Calculations', () => {
  
  describe('Subtotal Calculations', () => {
    const calculateSubtotal = (items: Array<{ price: number; quantity: number }>): number => {
      return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    it('should calculate subtotal for single item', () => {
      const items = [{ price: 10.00, quantity: 1 }];
      expect(calculateSubtotal(items)).toBe(10.00);
    });

    it('should calculate subtotal for multiple quantities', () => {
      const items = [{ price: 15.50, quantity: 3 }];
      expect(calculateSubtotal(items)).toBe(46.50);
    });

    it('should calculate subtotal for multiple items', () => {
      const items = [
        { price: 10.00, quantity: 2 },
        { price: 5.50, quantity: 1 },
        { price: 8.00, quantity: 3 }
      ];
      expect(calculateSubtotal(items)).toBe(49.50);
    });

    it('should return 0 for empty cart', () => {
      expect(calculateSubtotal([])).toBe(0);
    });
  });

  describe('Tax Calculations', () => {
    const calculateTax = (subtotal: number, taxRate: number): number => {
      return Number((subtotal * taxRate).toFixed(2));
    };

    it('should calculate tax at 8% rate', () => {
      expect(calculateTax(100, 0.08)).toBe(8.00);
    });

    it('should calculate tax at 6.5% rate', () => {
      expect(calculateTax(50, 0.065)).toBe(3.25);
    });

    it('should handle zero tax rate', () => {
      expect(calculateTax(100, 0)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateTax(33.33, 0.08)).toBe(2.67);
    });
  });

  describe('Shipping Calculations', () => {
    const calculateShipping = (subtotal: number, freeShippingThreshold: number = 50): number => {
      if (subtotal >= freeShippingThreshold) return 0;
      if (subtotal === 0) return 0;
      return 5.99;
    };

    it('should charge standard shipping for small orders', () => {
      expect(calculateShipping(25)).toBe(5.99);
    });

    it('should provide free shipping above threshold', () => {
      expect(calculateShipping(60)).toBe(0);
    });

    it('should provide free shipping at exact threshold', () => {
      expect(calculateShipping(50)).toBe(0);
    });

    it('should return 0 for empty cart', () => {
      expect(calculateShipping(0)).toBe(0);
    });
  });

  describe('Discount Calculations', () => {
    const applyDiscount = (subtotal: number, discountPercent: number): number => {
      const discount = subtotal * (discountPercent / 100);
      return Number((subtotal - discount).toFixed(2));
    };

    it('should apply 10% discount', () => {
      expect(applyDiscount(100, 10)).toBe(90.00);
    });

    it('should apply 25% discount', () => {
      expect(applyDiscount(80, 25)).toBe(60.00);
    });

    it('should handle 0% discount', () => {
      expect(applyDiscount(50, 0)).toBe(50.00);
    });

    it('should round to 2 decimal places', () => {
      expect(applyDiscount(33.33, 15)).toBe(28.33);
    });
  });

  describe('Total with All Calculations', () => {
    const calculateCartTotal = (
      items: Array<{ price: number; quantity: number }>,
      taxRate: number,
      discountPercent: number = 0
    ): { subtotal: number; tax: number; shipping: number; discount: number; total: number } => {
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = subtotal * (discountPercent / 100);
      const afterDiscount = subtotal - discountAmount;
      const tax = Number((afterDiscount * taxRate).toFixed(2));
      const shipping = afterDiscount >= 50 ? 0 : (subtotal === 0 ? 0 : 5.99);
      const total = Number((afterDiscount + tax + shipping).toFixed(2));

      return {
        subtotal: Number(subtotal.toFixed(2)),
        tax,
        shipping,
        discount: Number(discountAmount.toFixed(2)),
        total
      };
    };

    it('should calculate total without discount', () => {
      const items = [{ price: 25.00, quantity: 2 }];
      const result = calculateCartTotal(items, 0.08);
      
      expect(result.subtotal).toBe(50.00);
      expect(result.discount).toBe(0);
      expect(result.tax).toBe(4.00);
      expect(result.shipping).toBe(0); // Free shipping at $50
      expect(result.total).toBe(54.00);
    });

    it('should calculate total with discount and shipping', () => {
      const items = [{ price: 15.00, quantity: 2 }];
      const result = calculateCartTotal(items, 0.08, 10);
      
      expect(result.subtotal).toBe(30.00);
      expect(result.discount).toBe(3.00);
      expect(result.tax).toBe(2.16); // (30 - 3) * 0.08
      expect(result.shipping).toBe(5.99);
      expect(result.total).toBe(35.15);
    });

    it('should handle complex multi-item cart', () => {
      const items = [
        { price: 12.50, quantity: 2 },
        { price: 8.75, quantity: 3 },
        { price: 5.00, quantity: 1 }
      ];
      const result = calculateCartTotal(items, 0.065, 15);
      
      expect(result.subtotal).toBe(56.25);
      expect(result.discount).toBe(8.44);
      expect(result.tax).toBe(3.11);
      expect(result.shipping).toBe(0); // Free shipping over $50
      expect(result.total).toBe(50.92);
    });
  });
});
