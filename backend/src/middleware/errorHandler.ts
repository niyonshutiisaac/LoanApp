import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../lib/errors";
import { logger } from "../lib/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `No route ${req.method} ${req.path}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: err.issues[0]?.message ?? "Invalid input", details: err.issues },
    });
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");
  if (process.env.NODE_ENV === "test") console.error(err);
  res.status(500).json({ success: false, error: { code: "UNKNOWN_ERROR", message: "Something went wrong" } });
}
