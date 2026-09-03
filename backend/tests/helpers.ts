import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

export const app = createApp();

const TABLES = [
  "idempotency_keys",
  "reminders",
  "payments",
  "purchase_items",
  "purchases",
  "sale_items",
  "sales",
  "customer_ledger_entries",
  "customers",
  "products",
  "refresh_tokens",
  "users",
  "shops",
];

export async function resetDb() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
}

export interface TestSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  shopId: string;
}

export async function registerTestUser(overrides: Partial<{ name: string; email: string; password: string }> = {}): Promise<TestSession> {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: overrides.name ?? "Test Owner",
      email: overrides.email ?? `owner+${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
      password: overrides.password ?? "password123",
    });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  const { user, shop, accessToken, refreshToken } = res.body.data;
  return { accessToken, refreshToken, userId: user.id, shopId: shop.id };
}

export function authed(session: TestSession) {
  return { Authorization: `Bearer ${session.accessToken}` };
}
