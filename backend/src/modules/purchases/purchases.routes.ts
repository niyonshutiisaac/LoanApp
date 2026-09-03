import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { idempotent } from "../../middleware/idempotency";
import { validateBody, validateQuery } from "../../middleware/validate";
import { purchasesService } from "./purchases.service";
import { purchaseInputSchema, purchaseListQuerySchema } from "./purchases.schemas";

export const purchasesRouter = Router();
purchasesRouter.use(requireAuth);

purchasesRouter.get(
  "/",
  validateQuery(purchaseListQuerySchema),
  asyncHandler(async (req, res) => sendData(res, await purchasesService.list(req.auth!.shopId, req.query as never))),
);

purchasesRouter.post(
  "/",
  idempotent("purchases"),
  validateBody(purchaseInputSchema),
  asyncHandler(async (req, res) => sendData(res, await purchasesService.create(req.auth!.shopId, req.body), 201)),
);
