import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { expensesService } from "./expenses.service";
import { expenseInputSchema, expenseListQuerySchema } from "./expenses.schemas";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

expensesRouter.get(
  "/",
  validateQuery(expenseListQuerySchema),
  asyncHandler(async (req, res) => sendData(res, await expensesService.list(req.auth!.shopId, req.query as never))),
);

expensesRouter.post(
  "/",
  validateBody(expenseInputSchema),
  asyncHandler(async (req, res) => sendData(res, await expensesService.create(req.auth!.shopId, req.body), 201)),
);
