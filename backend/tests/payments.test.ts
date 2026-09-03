import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, registerTestUser, resetDb, type TestSession } from "./helpers";

let session: TestSession;

beforeEach(async () => {
  await resetDb();
  session = await registerTestUser();
});

async function creditSaleFor(customerId: string, amount: string) {
  return request(app)
    .post("/api/v1/sales")
    .set(authed(session))
    .send({
      customerId,
      paymentType: "CREDIT",
      dueDate: "2099-01-01",
      items: [{ productName: "Item", quantity: 1, unitPrice: amount }],
    });
}

describe("payments", () => {
  it("reduces the customer's balance and the sale's remaining amount", async () => {
    const customer = (await request(app).post("/api/v1/customers").set(authed(session)).send({ name: "David" })).body.data;
    const sale = (await creditSaleFor(customer.id, "10000")).body.data;

    const payment = await request(app)
      .post("/api/v1/payments")
      .set(authed(session))
      .send({ customerId: customer.id, amount: "4000", saleId: sale.id });

    expect(payment.status).toBe(201);
    expect(payment.body.data.balanceAfter).toBe("6000.00");

    const custAfter = await request(app).get(`/api/v1/customers/${customer.id}`).set(authed(session));
    expect(custAfter.body.data.balance).toBe("6000.00");

    const saleAfter = await request(app).get(`/api/v1/sales/${sale.id}`).set(authed(session));
    expect(saleAfter.body.data.remainingAmount).toBe("6000.00");
    expect(saleAfter.body.data.paidAmount).toBe("4000.00");
  });

  it("rejects a payment that exceeds the outstanding balance", async () => {
    const customer = (await request(app).post("/api/v1/customers").set(authed(session)).send({ name: "David" })).body.data;
    await creditSaleFor(customer.id, "5000");

    const res = await request(app).post("/api/v1/payments").set(authed(session)).send({ customerId: customer.id, amount: "9000" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("PAYMENT_EXCEEDS_BALANCE");
  });
});
