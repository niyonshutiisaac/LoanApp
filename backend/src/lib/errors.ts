export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "EMAIL_TAKEN"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CUSTOMER_NOT_FOUND"
  | "PRODUCT_NOT_FOUND"
  | "SALE_NOT_FOUND"
  | "SHOP_NOT_FOUND"
  | "REMINDER_NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "PAYMENT_EXCEEDS_BALANCE"
  | "RATE_LIMITED"
  | "UNKNOWN_ERROR";

export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function notFound(code: ErrorCode, message: string): never {
  throw new ApiError(code, message, 404);
}

export function badRequest(message: string, details?: unknown): never {
  throw new ApiError("VALIDATION_ERROR", message, 422, details);
}

export function unauthenticated(message = "Not authenticated"): never {
  throw new ApiError("UNAUTHENTICATED", message, 401);
}
