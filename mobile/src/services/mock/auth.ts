import type {
  AuthSession,
  LoginInput,
  RegisterInput,
  User,
  Shop,
} from "@/types/api";
import { nextId, type MockDb } from "./db";
import { wait, throwApiError } from "./utils";

export const mockAuth = {
  async login(db: MockDb, input: LoginInput): Promise<AuthSession> {
    await wait(400);
    const user = db.users.find(
      (u) => u.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (!user || user.password !== input.password) {
      throwApiError("INVALID_CREDENTIALS", "Email or password is incorrect", 401);
    }
    return sessionFor(db, user);
  },

  async register(db: MockDb, input: RegisterInput): Promise<AuthSession> {
    await wait(500);
    if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throwApiError("EMAIL_TAKEN", "An account with this email already exists", 409);
    }
    const user: User & { password: string } = {
      id: nextId(db, "user"),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      password: input.password,
      createdAt: new Date().toISOString(),
    };
    const shop: Shop = {
      id: nextId(db, "shop"),
      name: input.shopName?.trim() || `${user.name.split(" ")[0]}'s Shop`,
      phone: null,
      address: null,
      currency: "RWF",
      timezone: "Africa/Kigali",
      allowNegativeInventory: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(user as never);
    db.shops.push(shop);
    return { user, shop, accessToken: "mock_access_token", refreshToken: "mock_refresh_token" };
  },

  async refresh(): Promise<{ accessToken: string; refreshToken: string }> {
    await wait(150);
    return { accessToken: "mock_access_token", refreshToken: "mock_refresh_token" };
  },

  async me(db: MockDb): Promise<{ user: User; shop: Shop }> {
    await wait(150);
    const user = db.users[0];
    const shop = db.shops[0];
    if (!user || !shop) throwApiError("UNAUTHENTICATED", "Not authenticated", 401);
    return { user, shop };
  },

  async updateProfile(db: MockDb, patch: Partial<User>): Promise<User> {
    await wait(250);
    const user = db.users[0];
    Object.assign(user, patch);
    return user;
  },
};

function sessionFor(db: MockDb, user: { id: string }): AuthSession {
  const full = db.users.find((u) => u.id === user.id)!;
  const shop = db.shops[0] ?? null;
  return {
    user: distinctUser(full),
    shop: shop ? { ...shop } : null,
    accessToken: "mock_access_token",
    refreshToken: "mock_refresh_token",
  };
}

function distinctUser(u: MockDb["users"][number]): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    createdAt: u.createdAt,
  };
}