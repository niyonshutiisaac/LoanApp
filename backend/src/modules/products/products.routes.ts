import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { productsService } from "./products.service";
import { productInputSchema, productListQuerySchema, productUpdateSchema, stockAdjustSchema } from "./products.schemas";

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get(
  "/",
  validateQuery(productListQuerySchema),
  asyncHandler(async (req, res) => sendData(res, await productsService.list(req.auth!.shopId, req.query as never))),
);

productsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => sendData(res, await productsService.get(req.auth!.shopId, req.params.id))),
);

productsRouter.post(
  "/",
  validateBody(productInputSchema),
  asyncHandler(async (req, res) => sendData(res, await productsService.create(req.auth!.shopId, req.body), 201)),
);

productsRouter.patch(
  "/:id",
  validateBody(productUpdateSchema),
  asyncHandler(async (req, res) => sendData(res, await productsService.update(req.auth!.shopId, req.params.id, req.body))),
);

productsRouter.post(
  "/:id/stock",
  validateBody(stockAdjustSchema),
  asyncHandler(async (req, res) => sendData(res, await productsService.adjustStock(req.auth!.shopId, req.params.id, req.body.quantity))),
);

productsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => sendData(res, await productsService.archive(req.auth!.shopId, req.params.id))),
);
