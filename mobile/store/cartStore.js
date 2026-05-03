import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "bookworm_cart";

export const useCartStore = create((set, get) => ({
  items: [],

  loadCart: async () => {
    try {
      const raw = await AsyncStorage.getItem(CART_KEY);
      if (raw) set({ items: JSON.parse(raw) });
    } catch {}
  },

  _save: async (items) => {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  },

  addToCart: (book) => {
    const { items, _save } = get();
    const bookId = book._id || book.bookId;
    const price = book.discountPercentage > 0
      ? Math.round(book.price * (1 - book.discountPercentage / 100) * 100) / 100
      : book.price;

    const existing = items.find((i) => i.bookId === bookId);
    let updated;
    if (existing) {
      updated = items.map((i) =>
        i.bookId === bookId ? { ...i, quantity: Math.min(i.quantity + 1, i.stockCount) } : i
      );
    } else {
      updated = [
        ...items,
        {
          bookId,
          title: book.title,
          image: book.image,
          price,
          originalPrice: book.price,
          stockCount: book.stockCount,
          quantity: 1,
        },
      ];
    }
    set({ items: updated });
    _save(updated);
  },

  removeFromCart: (bookId) => {
    const { items, _save } = get();
    const updated = items.filter((i) => i.bookId !== bookId);
    set({ items: updated });
    _save(updated);
  },

  updateQuantity: (bookId, newQty) => {
    const { items, _save } = get();
    if (newQty < 1) {
      const updated = items.filter((i) => i.bookId !== bookId);
      set({ items: updated });
      _save(updated);
      return;
    }
    const updated = items.map((i) =>
      i.bookId === bookId ? { ...i, quantity: Math.min(newQty, i.stockCount) } : i
    );
    set({ items: updated });
    _save(updated);
  },

  clearCart: async () => {
    set({ items: [] });
    await AsyncStorage.removeItem(CART_KEY);
  },

  getCartTotal: () => {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  getItemCount: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },

  isInCart: (bookId) => {
    return get().items.some((i) => i.bookId === bookId);
  },
}));
