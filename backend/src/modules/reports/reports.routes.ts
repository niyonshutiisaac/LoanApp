import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";
import { reportsService } from "./reports.service";
import { reportQuerySchema } from "./reports.schemas";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

const handler = asyncHandler(async (req, res) => sendData(res, await reportsService.get(req.auth!.shopId, req.query as never)));

// GET /reports and GET /reports/sales both map to the same handler today,
// matching the mock where the `kind` param doesn't change the underlying query.
reportsRouter.get("/", validateQuery(reportQuerySchema), handler);
reportsRouter.get("/sales", validateQuery(reportQuerySchema), handler);
