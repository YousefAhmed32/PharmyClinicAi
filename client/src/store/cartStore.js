import { create } from 'zustand';
import { cartAPI } from '../api/services';
import toast from 'react-hot-toast';

// Access i18n outside React context (same pattern as axios)
const t = (key, fallback) => {
  try {
    return window.__i18n__?.t(key) || fallback;
  } catch {
    return fallback;
  }
};

const useCartStore = create((set, get) => ({
  cart:      null,
  isLoading: false,

  // Computed
  totalItems: () => get().cart?.totalItems || 0,
  subtotal:   () => get().cart?.subtotal   || 0,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await cartAPI.getCart();
      set({ cart: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, quantity = 1, variantId = null) => {
    try {
      const { data } = await cartAPI.addItem(productId, quantity, variantId);
      set({ cart: data.data });
      toast.success(t('store.addToCart', 'Added to cart') + ' ✓');
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.unknown', 'Failed');
      toast.error(msg);
      throw new Error(msg);
    }
  },

  updateItem: async (productId, quantity) => {
    try {
      const { data } = await cartAPI.updateItem(productId, quantity);
      set({ cart: data.data });
    } catch (err) {
      toast.error(err.response?.data?.message || t('errors.unknown', 'Update failed'));
    }
  },

  removeItem: async (productId) => {
    // Optimistic update
    const previous = get().cart;
    set(state => ({
      cart: state.cart ? {
        ...state.cart,
        items: state.cart.items.filter(i => i.product?._id !== productId && i.product !== productId),
      } : null,
    }));
    try {
      const { data } = await cartAPI.removeItem(productId);
      set({ cart: data.data });
      toast.success(t('cart.remove', 'Removed') + ' ✓');
    } catch (err) {
      // Rollback on failure
      set({ cart: previous });
      toast.error(err.response?.data?.message || t('errors.unknown', 'Remove failed'));
    }
  },

  clearCart: async () => {
    try {
      await cartAPI.clearCart();
      set({ cart: null });
    } catch { /* silent — UI already cleared */ }
  },

  resetCart: () => set({ cart: null }),
}));

export default useCartStore;