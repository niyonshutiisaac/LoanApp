import dotenv from "dotenv";
import path from "node:path";

// Tests need their own DATABASE_URL (ideally a separate Neon branch) since the
// suite truncates tables between tests — .env.test overrides .env.
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
