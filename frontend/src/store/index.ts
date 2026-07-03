import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice.js';
import uiReducer from './uiSlice.js';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
