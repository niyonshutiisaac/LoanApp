import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { remindersService } from "./reminders.service";
import { reminderInputSchema, reminderListQuerySchema } from "./reminders.schemas";

export const remindersRouter = Router();
remindersRouter.use(requireAuth);

remindersRouter.get(
  "/",
  validateQuery(reminderListQuerySchema),
  asyncHandler(async (req, res) => sendData(res, await remindersService.list(req.auth!.shopId, req.query as never))),
);

remindersRouter.post(
  "/",
  validateBody(reminderInputSchema),
  asyncHandler(async (req, res) => sendData(res, await remindersService.create(req.auth!.shopId, req.body), 201)),
);

remindersRouter.post(
  "/:id/send",
  asyncHandler(async (req, res) => sendData(res, await remindersService.sendNow(req.auth!.shopId, req.params.id))),
);
