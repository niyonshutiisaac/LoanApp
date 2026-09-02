import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { AuthSession, User, Shop } from "@/types/api";

const ACCESS_TOKEN_KEY = "loanapp.access_token";
const REFRESH_TOKEN_KEY = "loanapp.refresh_token";
const USER_KEY = "loanapp.user"; // non-sensitive profile info, AsyncStorage is fine

// SecureStore is not available on web; fall back to AsyncStorage (localStorage) there.
const isWeb = Platform.OS === "web";
const secureGet = (key: string) => (isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key));
const secureSet = (key: string, value: string) =>
  isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
const secureDelete = (key: string) =>
  isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);

interface AuthState {
  user: User | null;
  shop: Shop | null;
  isHydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: AuthSession) => Promise<void>;
  setUser: (user: User) => void;
  setShop: (shop: Shop) => void;
  setAccessToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  shop: null,
  isHydrated: false,
  accessToken: null,
  refreshToken: null,

  setSession: async (session) => {
    await secureSet(ACCESS_TOKEN_KEY, session.accessToken);
    await secureSet(REFRESH_TOKEN_KEY, session.refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user ?? null));
    set({
      user: session.user ?? null,
      shop: session.shop ?? null,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  },

  setUser: (user) => {
    set({ user });
  },

  setShop: (shop) => {
    set({ shop });
  },

  setAccessToken: async (token) => {
    await secureSet(ACCESS_TOKEN_KEY, token);
    set({ accessToken: token });
  },

  logout: async () => {
    await secureDelete(ACCESS_TOKEN_KEY);
    await secureDelete(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    set({ user: null, shop: null, accessToken: null, refreshToken: null });
  },

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userRaw] = await Promise.all([
        secureGet(ACCESS_TOKEN_KEY),
        secureGet(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      const user = userRaw ? (JSON.parse(userRaw) as User) : null;
      set({ accessToken, refreshToken, user, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },
}));

export async function persistAccessToken(token: string): Promise<void> {
  await secureSet(ACCESS_TOKEN_KEY, token);
  useAuthStore.getState().setAccessToken(token);
}

export function readRefreshToken(): string | null {
  return useAuthStore.getState().refreshToken;
}