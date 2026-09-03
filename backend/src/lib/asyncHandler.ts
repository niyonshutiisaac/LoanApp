import type { NextFunction, Request, RequestHandler, Response } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async route handler so rejected promises reach Express's error middleware. */
export function asyncHandler(fn: Handler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function sendData(res: Response, data: unknown, status = 200) {
  res.status(status).json({ success: true, data });
}
