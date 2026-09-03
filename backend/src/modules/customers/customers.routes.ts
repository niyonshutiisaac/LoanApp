import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { customersService } from "./customers.service";
import { customerInputSchema, customerListQuerySchema, customerUpdateSchema } from "./customers.schemas";

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get(
  "/due-soon",
  asyncHandler(async (req, res) => sendData(res, await customersService.dueSoon(req.auth!.shopId))),
);

customersRouter.get(
  "/",
  validateQuery(customerListQuerySchema),
  asyncHandler(async (req, res) => sendData(res, await customersService.list(req.auth!.shopId, req.query as never))),
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => sendData(res, await customersService.get(req.auth!.shopId, req.params.id))),
);

customersRouter.post(
  "/",
  validateBody(customerInputSchema),
  asyncHandler(async (req, res) => sendData(res, await customersService.create(req.auth!.shopId, req.body), 201)),
);

customersRouter.patch(
  "/:id",
  validateBody(customerUpdateSchema),
  asyncHandler(async (req, res) => sendData(res, await customersService.update(req.auth!.shopId, req.params.id, req.body))),
);

customersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => sendData(res, await customersService.archive(req.auth!.shopId, req.params.id))),
);

customersRouter.get(
  "/:id/ledger",
  asyncHandler(async (req, res) => sendData(res, await customersService.ledger(req.auth!.shopId, req.params.id))),
);
