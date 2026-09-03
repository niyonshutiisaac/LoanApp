import { Router } from "express";
import { asyncHandler, sendData } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { authService } from "./auth.service";
import { changePasswordSchema, loginSchema, refreshSchema, registerSchema } from "./auth.schemas";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => sendData(res, await authService.register(req.body), 201)),
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => sendData(res, await authService.login(req.body))),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => sendData(res, await authService.me(req.auth!.userId))),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.logout(req.auth!.userId);
    res.status(204).end();
  }),
);

authRouter.post(
  "/refresh",
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => sendData(res, await authService.refresh(req.body.refreshToken))),
);

authRouter.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) =>
    sendData(res, await authService.changePassword(req.auth!.userId, req.body.oldPassword, req.body.newPassword)),
  ),
);
