import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { customersRouter } from "./modules/customers/customers.routes";
import { productsRouter } from "./modules/products/products.routes";
import { salesRouter } from "./modules/sales/sales.routes";
import { purchasesRouter } from "./modules/purchases/purchases.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { expensesRouter } from "./modules/expenses/expenses.routes";
import { remindersRouter } from "./modules/reminders/reminders.routes";
import { shopRouter } from "./modules/shop/shop.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { reportsRouter } from "./modules/reports/reports.routes";

export function createApp() {
  const app = express();

  // Render (and most PaaS) sit behind a reverse proxy — needed for correct
  // req.ip in the rate limiter and for secure cookies/redirects if added later.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","), credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  // Generous global cap so one client can't monopolize the process; auth gets a
  // tighter one below since credential-stuffing/brute-force targets it specifically.
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok", uptime: process.uptime() } }));

  const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
  app.use("/api/v1/auth", authLimiter, authRouter);
  app.use("/api/v1/customers", customersRouter);
  app.use("/api/v1/products", productsRouter);
  app.use("/api/v1/sales", salesRouter);
  app.use("/api/v1/purchases", purchasesRouter);
  app.use("/api/v1/payments", paymentsRouter);
  app.use("/api/v1/expenses", expensesRouter);
  app.use("/api/v1/reminders", remindersRouter);
  app.use("/api/v1/shop", shopRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/reports", reportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
