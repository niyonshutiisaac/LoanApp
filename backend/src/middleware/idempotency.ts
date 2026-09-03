import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

/**
 * Dedupes POST requests that carry an `Idempotency-Key` header (sales, purchases,
 * payments) so a retried request after a dropped response never double-books a
 * sale or double-charges stock. Must run after requireAuth so req.auth is set.
 */
export function idempotent(endpoint: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.header("Idempotency-Key");
    if (!key || !req.auth) return next();

    const shopId = req.auth.shopId;
    const existing = await prisma.idempotencyKey.findUnique({
      where: { shopId_key_endpoint: { shopId, key, endpoint } },
    });
    if (existing) {
      res.status(existing.statusCode).json(existing.responseBody as object);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        prisma.idempotencyKey
          .create({ data: { shopId, key, endpoint, statusCode: res.statusCode, responseBody: body as object } })
          .catch(() => undefined); // best-effort cache; never block the response on it
      }
      return originalJson(body);
    }) as Response["json"];

    next();
  };
}
