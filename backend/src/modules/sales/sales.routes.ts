import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { idempotent } from "../../middleware/idempotency";
import { validateBody, validateQuery } from "../../middleware/validate";
import { salesService } from "./sales.service";
import { saleInputSchema, saleListQuerySchema } from "./sales.schemas";

export const salesRouter = Router();
salesRouter.use(requireAuth);

salesRouter.get(
  "/",
  validateQuery(saleListQuerySchema),
  asyncHandler(async (req, res) => sendData(res, await salesService.list(req.auth!.shopId, req.query as never))),
);

salesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => sendData(res, await salesService.get(req.auth!.shopId, req.params.id))),
);

salesRouter.post(
  "/",
  idempotent("sales"),
  validateBody(saleInputSchema),
  asyncHandler(async (req, res) => sendData(res, await salesService.create(req.auth!.shopId, req.body), 201)),
);
