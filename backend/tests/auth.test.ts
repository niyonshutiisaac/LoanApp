import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerTestUser, resetDb } from "./helpers";

beforeEach(resetDb);

describe("auth", () => {
  it("registers a new user and shop, returning a session", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Jane Doe", email: "jane@test.com", password: "secret123", shopName: "Jane's Shop" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("jane@test.com");
    expect(res.body.data.shop.name).toBe("Jane's Shop");
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it("rejects registering the same email twice", async () => {
    await registerTestUser({ email: "dupe@test.com" });
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Someone Else", email: "dupe@test.com", password: "password123" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("logs in with correct credentials and rejects wrong password", async () => {
    await registerTestUser({ email: "login@test.com", password: "correcthorse" });

    const ok = await request(app).post("/api/v1/auth/login").send({ email: "login@test.com", password: "correcthorse" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toBeTruthy();

    const bad = await request(app).post("/api/v1/auth/login").send({ email: "login@test.com", password: "wrong" });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects requests without a valid access token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the current user/shop from /auth/me", async () => {
    const session = await registerTestUser({ email: "me@test.com" });
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${session.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(session.userId);
  });

  it("rotates tokens on refresh and rejects a reused refresh token", async () => {
    const session = await registerTestUser({ email: "refresh@test.com" });

    const refreshed = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: session.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();
    expect(refreshed.body.data.refreshToken).not.toBe(session.refreshToken);

    const reused = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: session.refreshToken });
    expect(reused.status).toBe(401);
  });

  it("changes the password only when the old password is correct", async () => {
    const session = await registerTestUser({ email: "changepw@test.com", password: "oldpassword" });

    const wrongOld = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ oldPassword: "notright", newPassword: "newpassword" });
    expect(wrongOld.status).toBe(401);

    const ok = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ oldPassword: "oldpassword", newPassword: "newpassword" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.ok).toBe(true);

    const loginWithNew = await request(app).post("/api/v1/auth/login").send({ email: "changepw@test.com", password: "newpassword" });
    expect(loginWithNew.status).toBe(200);
  });
});
