import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { shopService } from "./shop.service";
import { shopUpdateSchema } from "./shop.schemas";

export const shopRouter = Router();
shopRouter.use(requireAuth);

shopRouter.get(
  "/",
  asyncHandler(async (req, res) => sendData(res, await shopService.get(req.auth!.shopId))),
);

shopRouter.patch(
  "/",
  validateBody(shopUpdateSchema),
  asyncHandler(async (req, res) => sendData(res, await shopService.update(req.auth!.shopId, req.body))),
);
