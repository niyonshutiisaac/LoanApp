import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, registerTestUser, resetDb, type TestSession } from "./helpers";

let session: TestSession;

beforeEach(async () => {
  await resetDb();
  session = await registerTestUser();
});

async function createProduct(stockQuantity = 10) {
  const res = await request(app)
    .post("/api/v1/products")
    .set(authed(session))
    .send({ name: "Sugar", buyingPrice: "4000", sellingPrice: "5000", stockQuantity, lowStockThreshold: 2 });
  return res.body.data;
}

async function createCustomer() {
  const res = await request(app).post("/api/v1/customers").set(authed(session)).send({ name: "John" });
  return res.body.data;
}

describe("sales", () => {
  it("records a cash sale, marks it fully paid, and decrements stock", async () => {
    const product = await createProduct(10);
    const res = await request(app)
      .post("/api/v1/sales")
      .set(authed(session))
      .send({ paymentType: "CASH", items: [{ productId: product.id, quantity: 2, unitPrice: "5000" }] });

    expect(res.status).toBe(201);
    expect(res.body.data.totalAmount).toBe("10000.00");
    expect(res.body.data.paidAmount).toBe("10000.00");
    expect(res.body.data.remainingAmount).toBe("0.00");

    const productAfter = await request(app).get(`/api/v1/products/${product.id}`).set(authed(session));
    expect(productAfter.body.data.stockQuantity).toBe(8);
  });

  it("rejects a credit sale without a customer", async () => {
    const product = await createProduct();
    const res = await request(app)
      .post("/api/v1/sales")
      .set(authed(session))
      .send({ paymentType: "CREDIT", dueDate: "2099-01-01", items: [{ productId: product.id, quantity: 1, unitPrice: "5000" }] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("records a credit sale, leaves it fully unpaid, and writes a ledger entry + reminder", async () => {
    const product = await createProduct();
    const customer = await createCustomer();
    const res = await request(app)
      .post("/api/v1/sales")
      .set(authed(session))
      .send({
        customerId: customer.id,
        paymentType: "CREDIT",
        dueDate: "2099-01-01",
        items: [{ productId: product.id, quantity: 1, unitPrice: "5000" }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.paidAmount).toBe("0.00");
    expect(res.body.data.remainingAmount).toBe("5000.00");

    const ledger = await request(app).get(`/api/v1/customers/${customer.id}/ledger`).set(authed(session));
    expect(ledger.body.data).toHaveLength(1);
    expect(ledger.body.data[0].type).toBe("SALE");

    const custAfter = await request(app).get(`/api/v1/customers/${customer.id}`).set(authed(session));
    expect(custAfter.body.data.balance).toBe("5000.00");

    const reminders = await request(app).get("/api/v1/reminders").set(authed(session));
    expect(reminders.body.data.items).toHaveLength(1);
    expect(reminders.body.data.items[0].status).toBe("PENDING");
  });

  it("rejects a partial sale where the paid amount is not between zero and the total", async () => {
    const product = await createProduct();
    const customer = await createCustomer();
    const res = await request(app)
      .post("/api/v1/sales")
      .set(authed(session))
      .send({
        customerId: customer.id,
        paymentType: "PARTIAL",
        paidAmount: "5000",
        dueDate: "2099-01-01",
        items: [{ productId: product.id, quantity: 1, unitPrice: "5000" }],
      });
    expect(res.status).toBe(422);
  });

  it("blocks a sale that would take stock negative", async () => {
    const product = await createProduct(1);
    const res = await request(app)
      .post("/api/v1/sales")
      .set(authed(session))
      .send({ paymentType: "CASH", items: [{ productId: product.id, quantity: 5, unitPrice: "5000" }] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");

    const productAfter = await request(app).get(`/api/v1/products/${product.id}`).set(authed(session));
    expect(productAfter.body.data.stockQuantity).toBe(1);
  });
});
