import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, clearDb } from "./helpers.js";

let app;

beforeAll(() => {
  app = createTestApp();
});

beforeEach(() => {
  clearDb();
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
describe("POST /api/auth/register", () => {
  it("returns 201 with token and user on valid registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "player1", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({ username: "player1" });
    expect(res.body.user.id).toBeDefined();
    // password hash must never be returned
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it("returns 409 on duplicate username", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ username: "dup_user", password: "password123" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "dup_user", password: "different_pass" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already taken/i);
  });

  it("returns 400 when password is too short (< 6 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "valid_user", password: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 characters/i);
  });

  it("returns 400 when username is too short (< 3 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "ab", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });

  it("returns 400 when username is too long (> 20 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "a".repeat(21), password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });

  it("returns 400 when username contains invalid characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "bad user name", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });

  it("returns 400 when username contains special chars (hyphens)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "bad-name", password: "password123" });

    expect(res.status).toBe(400);
  });

  it("accepts usernames with underscores (3-20 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "space_pilot", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("space_pilot");
  });

  it("accepts minimum-length username (3 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "ace", password: "password123" });

    expect(res.status).toBe(201);
  });

  it("accepts minimum-length password (6 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "minpass", password: "sixchr" });

    expect(res.status).toBe(201);
  });

  it("returns 400 when username is missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ password: "password123" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "testuser" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ username: "login_tester", password: "mypassword" });
  });

  it("returns 200 with token and user on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "login_tester", password: "mypassword" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({ username: "login_tester" });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it("returns 401 on wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "login_tester", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 401 on nonexistent user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ghost_user", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns same error message for wrong password and nonexistent user (no enumeration)", async () => {
    const wrongPass = await request(app)
      .post("/api/auth/login")
      .send({ username: "login_tester", password: "wrong" });

    const noUser = await request(app)
      .post("/api/auth/login")
      .send({ username: "no_such_user", password: "password" });

    expect(wrongPass.body.error).toBe(noUser.body.error);
  });

  it("returns 400 when both fields are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "login_tester" });

    expect(res.status).toBe(400);
  });

  it("returned token is valid for subsequent requests", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "login_tester", password: "mypassword" });

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.username).toBe("login_tester");
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
describe("GET /api/auth/me", () => {
  let token;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "me_tester", password: "password123" });
    token = res.body.token;
  });

  it("returns user info with a valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("me_tester");
    expect(res.body.id).toBeDefined();
    expect(res.body.password_hash).toBeUndefined();
  });

  it("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 401 with a malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.valid.jwt");

    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong Authorization scheme (no Bearer prefix)", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Token ${token}`);

    expect(res.status).toBe(401);
  });

  it("returns 401 with an expired/tampered token", async () => {
    const fakeToken = token.slice(0, -5) + "xxxxx"; // corrupt the signature
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });
});
