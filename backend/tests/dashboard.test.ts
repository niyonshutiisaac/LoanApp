import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, registerTestUser, resetDb, type TestSession } from "./helpers";

let session: TestSession;

beforeEach(async () => {
  await resetDb();
  session = await registerTestUser();
});

describe("dashboard & reports", () => {
  it("reflects a cash sale in today's totals", async () => {
    const product = (
      await request(app)
        .post("/api/v1/products")
        .set(authed(session))
        .send({ name: "Sugar", buyingPrice: "4000", sellingPrice: "5000", stockQuantity: 10 })
    ).body.data;
    await request(app)
      .post("/api/v1/sales")
      .set(authed(session))
      .send({ paymentType: "CASH", items: [{ productId: product.id, quantity: 2, unitPrice: "5000" }] });

    const dashboard = await request(app).get("/api/v1/dashboard").set(authed(session));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.today.sales).toBe("10000.00");
    expect(dashboard.body.data.today.cashReceived).toBe("10000.00");
    expect(dashboard.body.data.today.saleCount).toBe(1);
    expect(dashboard.body.data.totals.productsInStock).toBe(1);
  });

  it("computes estimated profit in the reports range", async () => {
    const product = (
      await request(app)
        .post("/api/v1/products")
        .set(authed(session))
        .send({ name: "Sugar", buyingPrice: "4000", sellingPrice: "5000", stockQuantity: 10 })
    ).body.data;
    await request(app)
      .post("/api/v1/sales")
      .set(authed(session))
      .send({ paymentType: "CASH", items: [{ productId: product.id, quantity: 2, unitPrice: "5000" }] });

    const today = new Date().toISOString().slice(0, 10);
    const report = await request(app).get("/api/v1/reports").query({ from: today, to: today }).set(authed(session));
    expect(report.status).toBe(200);
    // sales 10000 - cost of goods (2 * 4000 = 8000) - expenses 0 = 2000
    expect(report.body.data.estimatedProfit).toBe("2000.00");
  });
});
