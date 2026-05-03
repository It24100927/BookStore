import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";
import { validateEmail, validatePassword, validateUsername } from "../lib/validation";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isCheckingAuth: true,

  // ─── Helper: make an authenticated request with auto-logout on 401 ───
  authFetch: async (url, options = {}) => {
    const { token } = useAuthStore.getState();
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Auto-logout on expired / invalid token
    if (response.status === 401) {
      await AsyncStorage.multiRemove(["token", "user"]);
      set({ token: null, user: null });
      return null; // caller should check for null
    }

    return response;
  },

  register: async (username, email, password) => {
    set({ isLoading: true });
    try {
      if (!validateUsername(username)) throw new Error("Username should be at least 3 characters long");
      if (!validateEmail(email)) throw new Error("Please enter a valid email address");
      if (!validatePassword(password)) throw new Error("Password should be at least 6 characters long");

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Something went wrong");

      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      await AsyncStorage.setItem("token", data.token);

      set({ token: data.token, user: data.user, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      if (!validateEmail(email)) throw new Error("Please enter a valid email address");
      if (!validatePassword(password)) throw new Error("Password should be at least 6 characters long");

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Something went wrong");

      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      await AsyncStorage.setItem("token", data.token);

      set({ token: data.token, user: data.user, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userJson = await AsyncStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : null;

      if (!token || !user) {
        set({ token: null, user: null });
        return;
      }

      // Validate against server with a timeout to avoid hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let response;
      try {
        response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.status === 401) {
        // Token expired — clear and force re-login
        await AsyncStorage.multiRemove(["token", "user"]);
        set({ token: null, user: null });
        return;
      }

      if (!response.ok) {
        // Server error — trust cached credentials temporarily
        set({ token, user });
        return;
      }

      const data = await response.json();
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      set({ token, user: data.user });
    } catch (error) {
      // Network error — use cached credentials to allow offline use
      try {
        const token = await AsyncStorage.getItem("token");
        const userJson = await AsyncStorage.getItem("user");
        const user = userJson ? JSON.parse(userJson) : null;
        if (token && user) {
          set({ token, user });
        } else {
          set({ token: null, user: null });
        }
      } catch {
        set({ token: null, user: null });
      }
    } finally {
      // Always resolve isCheckingAuth regardless of what happened above
      set({ isCheckingAuth: false });
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(["token", "user"]);
    set({ token: null, user: null });
  },

  updateProfile: async ({ username, email, password, profileImage, mobile, address, paymentCard }) => {
    const { authFetch } = useAuthStore.getState();
    set({ isLoading: true });
    try {
      if (!validateUsername(username)) throw new Error("Username should be at least 3 characters long");
      if (!validateEmail(email)) throw new Error("Please enter a valid email address");
      if (password && !validatePassword(password)) throw new Error("Password should be at least 6 characters long");

      const response = await authFetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        body: JSON.stringify({ username, email, password, profileImage, mobile, address, paymentCard }),
      });

      if (!response) return { success: false, error: "Session expired. Please log in again." };

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update profile");

      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      set({ user: data.user, isLoading: false });
      return { success: true, message: data.message };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },

  deleteAccount: async () => {
    const { authFetch } = useAuthStore.getState();
    set({ isLoading: true });
    try {
      const response = await authFetch(`${API_URL}/auth/account`, { method: "DELETE" });
      if (!response) return { success: false, error: "Session expired." };

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to delete account");

      await AsyncStorage.multiRemove(["token", "user"]);
      set({ token: null, user: null, isLoading: false });
      return { success: true, message: data.message };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },
}));
