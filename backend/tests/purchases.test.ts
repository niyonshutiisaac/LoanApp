import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, registerTestUser, resetDb, type TestSession } from "./helpers";

let session: TestSession;

beforeEach(async () => {
  await resetDb();
  session = await registerTestUser();
});

describe("purchases", () => {
  it("records a fully-paid purchase and increments stock", async () => {
    const product = await request(app)
      .post("/api/v1/products")
      .set(authed(session))
      .send({ name: "Rice", buyingPrice: "3500", sellingPrice: "4500", stockQuantity: 5 });

    const res = await request(app)
      .post("/api/v1/purchases")
      .set(authed(session))
      .send({ items: [{ productId: product.body.data.id, quantity: 10, unitCost: "3500" }] });

    expect(res.status).toBe(201);
    expect(res.body.data.totalAmount).toBe("35000.00");
    expect(res.body.data.paymentStatus).toBe("PAID");

    const after = await request(app).get(`/api/v1/products/${product.body.data.id}`).set(authed(session));
    expect(after.body.data.stockQuantity).toBe(15);
  });

  it("derives PARTIAL/UNPAID status from the payment amount", async () => {
    const partial = await request(app)
      .post("/api/v1/purchases")
      .set(authed(session))
      .send({ paymentAmount: "1000", items: [{ productName: "Quick item", quantity: 1, unitCost: "3000" }] });
    expect(partial.body.data.paymentStatus).toBe("PARTIAL");
    expect(partial.body.data.remainingAmount).toBe("2000.00");

    const unpaid = await request(app)
      .post("/api/v1/purchases")
      .set(authed(session))
      .send({ paymentAmount: "0", items: [{ productName: "Quick item 2", quantity: 1, unitCost: "3000" }] });
    expect(unpaid.body.data.paymentStatus).toBe("UNPAID");
  });
});
