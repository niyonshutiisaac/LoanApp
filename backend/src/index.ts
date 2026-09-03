import { createApp } from "./app";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`LoanApp API listening on port ${env.port} (${env.nodeEnv})`);
});

// Render sends SIGTERM on redeploy/scale-down; finish in-flight requests and
// close the DB pool cleanly instead of dropping connections mid-request.
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if something hangs longer than this.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});
