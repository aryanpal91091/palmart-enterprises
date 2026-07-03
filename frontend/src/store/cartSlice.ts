import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  discount: number; // Base product discount %
  gstPercent: number;
  quantity: number;
  discountPercentOverride: number; // Custom POS cashier discount override %
}

export interface CustomerData {
  id: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
}

export interface CouponData {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderAmount: number;
}

interface CartState {
  items: CartItem[];
  customer: CustomerData | null;
  coupon: CouponData | null;
  pointsToRedeem: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'SPLIT';
  splitPayments: {
    CASH: number;
    CARD: number;
    UPI: number;
  };
}

const initialState: CartState = {
  items: [],
  customer: null,
  coupon: null,
  pointsToRedeem: 0,
  paymentMethod: 'CASH',
  splitPayments: { CASH: 0, CARD: 0, UPI: 0 },
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<any>) => {
      const product = action.payload;
      const existing = state.items.find((item) => item.id === product.id);

      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode || '',
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          discount: product.discount || 0,
          gstPercent: product.gstPercent || 18,
          quantity: 1,
          discountPercentOverride: 0,
        });
      }
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity);
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    applyItemDiscountOverride: (state, action: PayloadAction<{ id: string; discountPercent: number }>) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        item.discountPercentOverride = Math.max(0, Math.min(100, action.payload.discountPercent));
      }
    },
    setCustomer: (state, action: PayloadAction<CustomerData | null>) => {
      state.customer = action.payload;
      state.pointsToRedeem = 0; // Reset redeemed points when customer changes
    },
    setCoupon: (state, action: PayloadAction<CouponData | null>) => {
      state.coupon = action.payload;
    },
    setPointsToRedeem: (state, action: PayloadAction<number>) => {
      state.pointsToRedeem = action.payload;
    },
    setPaymentMethod: (state, action: PayloadAction<'CASH' | 'CARD' | 'UPI' | 'SPLIT'>) => {
      state.paymentMethod = action.payload;
    },
    updateSplitPayment: (state, action: PayloadAction<{ method: 'CASH' | 'CARD' | 'UPI'; amount: number }>) => {
      state.splitPayments[action.payload.method] = Math.max(0, action.payload.amount);
    },
    clearCart: (state) => {
      state.items = [];
      state.customer = null;
      state.coupon = null;
      state.pointsToRedeem = 0;
      state.paymentMethod = 'CASH';
      state.splitPayments = { CASH: 0, CARD: 0, UPI: 0 };
    },
  },
});

export const {
  addToCart,
  updateQuantity,
  removeItem,
  applyItemDiscountOverride,
  setCustomer,
  setCoupon,
  setPointsToRedeem,
  setPaymentMethod,
  updateSplitPayment,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
