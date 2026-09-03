import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { idempotent } from "../../middleware/idempotency";
import { validateBody, validateQuery } from "../../middleware/validate";
import { paymentsService } from "./payments.service";
import { paymentInputSchema, paymentListQuerySchema } from "./payments.schemas";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

paymentsRouter.get(
  "/",
  validateQuery(paymentListQuerySchema),
  asyncHandler(async (req, res) => sendData(res, await paymentsService.list(req.auth!.shopId, req.query as never))),
);

paymentsRouter.post(
  "/",
  idempotent("payments"),
  validateBody(paymentInputSchema),
  asyncHandler(async (req, res) => sendData(res, await paymentsService.create(req.auth!.shopId, req.body), 201)),
);
