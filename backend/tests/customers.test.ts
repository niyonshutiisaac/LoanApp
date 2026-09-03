import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, registerTestUser, resetDb, type TestSession } from "./helpers";

let session: TestSession;

beforeEach(async () => {
  await resetDb();
  session = await registerTestUser();
});

describe("customers", () => {
  it("lists customers with search and pagination", async () => {
    for (const name of ["Alice", "Bob", "Charlie"]) {
      await request(app).post("/api/v1/customers").set(authed(session)).send({ name });
    }

    const page1 = await request(app).get("/api/v1/customers").query({ limit: 2 }).set(authed(session));
    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.total).toBe(3);
    expect(page1.body.data.totalPages).toBe(2);

    const searched = await request(app).get("/api/v1/customers").query({ search: "ali" }).set(authed(session));
    expect(searched.body.data.items.map((c: { name: string }) => c.name)).toEqual(["Alice"]);
  });

  it("404s for a customer that belongs to another shop", async () => {
    const other = await registerTestUser({ email: "other@test.com" });
    const customer = (await request(app).post("/api/v1/customers").set(authed(other)).send({ name: "Not Yours" })).body.data;

    const res = await request(app).get(`/api/v1/customers/${customer.id}`).set(authed(session));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CUSTOMER_NOT_FOUND");
  });

  it("archives a customer so it drops out of the active list", async () => {
    const customer = (await request(app).post("/api/v1/customers").set(authed(session)).send({ name: "Temp" })).body.data;
    const archived = await request(app).delete(`/api/v1/customers/${customer.id}`).set(authed(session));
    expect(archived.status).toBe(200);

    const list = await request(app).get("/api/v1/customers").set(authed(session));
    expect(list.body.data.items.find((c: { id: string }) => c.id === customer.id)).toBeUndefined();
  });
});
