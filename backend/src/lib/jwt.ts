import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "./env";

export interface AccessTokenPayload {
  sub: string; // userId
  shopId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

/** Refresh tokens are opaque random strings, not JWTs — only their SHA-256 hash is stored, so a DB leak can't be replayed. */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(): Date {
  const days = env.refreshTokenTtlDays;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
