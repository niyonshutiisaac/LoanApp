import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, registerTestUser, resetDb, type TestSession } from "./helpers";

let session: TestSession;

beforeEach(async () => {
  await resetDb();
  session = await registerTestUser();
});

describe("idempotency", () => {
  it("returns the cached response and does not double-decrement stock on a retried Idempotency-Key", async () => {
    const product = (
      await request(app)
        .post("/api/v1/products")
        .set(authed(session))
        .send({ name: "Sugar", buyingPrice: "4000", sellingPrice: "5000", stockQuantity: 10 })
    ).body.data;

    const key = "retry-key-1";
    const body = { paymentType: "CASH" as const, items: [{ productId: product.id, quantity: 3, unitPrice: "5000" }] };

    const first = await request(app).post("/api/v1/sales").set(authed(session)).set("Idempotency-Key", key).send(body);
    const second = await request(app).post("/api/v1/sales").set(authed(session)).set("Idempotency-Key", key).send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);

    const after = await request(app).get(`/api/v1/products/${product.id}`).set(authed(session));
    expect(after.body.data.stockQuantity).toBe(7); // decremented once, not twice
  });
});
