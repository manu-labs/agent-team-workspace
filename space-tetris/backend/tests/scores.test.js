import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, clearDb } from "./helpers.js";

let app;
let token;
let userId;

beforeAll(() => {
  app = createTestApp();
});

beforeEach(async () => {
  clearDb();
  // Register a fresh test user before each test
  const res = await request(app)
    .post("/api/auth/register")
    .send({ username: "score_tester", password: "password123" });
  token = res.body.token;
  userId = res.body.user.id;
});

// ---------------------------------------------------------------------------
// POST /api/scores
// ---------------------------------------------------------------------------
describe("POST /api/scores", () => {
  it("saves score and returns id, score, and rank for authenticated user", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 1000, lines_cleared: 10, level: 2, duration_seconds: 60 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.score).toBe(1000);
    expect(res.body.rank).toBe(1); // first score ever, should be rank 1
  });

  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app)
      .post("/api/scores")
      .send({ score: 1000, lines_cleared: 5, level: 1, duration_seconds: 30 });

    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", "Bearer fake.token.value")
      .send({ score: 1000, lines_cleared: 5, level: 1 });

    expect(res.status).toBe(401);
  });

  it("returns 400 when score field is missing", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ lines_cleared: 5, level: 1, duration_seconds: 30 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/score/i);
  });

  it("returns 400 when score is negative", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: -1, lines_cleared: 0, level: 1 });

    expect(res.status).toBe(400);
  });

  it("returns 400 when score is a string (not a number)", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: "one thousand", lines_cleared: 0, level: 1 });

    expect(res.status).toBe(400);
  });

  it("accepts score of 0 (valid game over immediately)", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 0, lines_cleared: 0, level: 1 });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(0);
  });

  it("defaults optional fields (lines_cleared, level, duration_seconds)", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 500 }); // no optional fields

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(500);
  });

  it("computes rank correctly relative to existing scores", async () => {
    // Register second user with a higher score
    const resB = await request(app)
      .post("/api/auth/register")
      .send({ username: "top_player", password: "password123" });
    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${resB.body.token}`)
      .send({ score: 9999, lines_cleared: 100, level: 10 });

    // Our user submits a lower score — should be rank 2
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 500, lines_cleared: 5, level: 1 });

    expect(res.status).toBe(201);
    expect(res.body.rank).toBe(2);
  });

  it("a new top score gets rank 1", async () => {
    // Submit two lower scores first
    const resB = await request(app)
      .post("/api/auth/register")
      .send({ username: "mid_player", password: "password123" });
    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${resB.body.token}`)
      .send({ score: 1000 });
    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 500 });

    // Now submit the top score
    const topRes = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 99999 });

    expect(topRes.status).toBe(201);
    expect(topRes.body.rank).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/scores/me
// ---------------------------------------------------------------------------
describe("GET /api/scores/me", () => {
  it("returns empty array when user has no scores", async () => {
    const res = await request(app)
      .get("/api/scores/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.scores).toEqual([]);
  });

  it("returns scores sorted by score descending", async () => {
    for (const score of [500, 2000, 1000]) {
      await request(app)
        .post("/api/scores")
        .set("Authorization", `Bearer ${token}`)
        .send({ score, lines_cleared: 5, level: 1 });
    }

    const res = await request(app)
      .get("/api/scores/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.scores).toHaveLength(3);
    expect(res.body.scores[0].score).toBe(2000);
    expect(res.body.scores[1].score).toBe(1000);
    expect(res.body.scores[2].score).toBe(500);
  });

  it("only returns scores belonging to the authenticated user", async () => {
    // Submit score as primary test user
    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 1000, lines_cleared: 5, level: 1 });

    // Register another user and submit a different score
    const other = await request(app)
      .post("/api/auth/register")
      .send({ username: "other_player", password: "password123" });
    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${other.body.token}`)
      .send({ score: 9999, lines_cleared: 100, level: 10 });

    // Primary user should only see their own score
    const res = await request(app)
      .get("/api/scores/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.scores).toHaveLength(1);
    expect(res.body.scores[0].score).toBe(1000);
  });

  it("score response includes expected fields", async () => {
    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 1500, lines_cleared: 15, level: 3, duration_seconds: 120 });

    const res = await request(app)
      .get("/api/scores/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const entry = res.body.scores[0];
    expect(entry.score).toBe(1500);
    expect(entry.lines_cleared).toBe(15);
    expect(entry.level).toBe(3);
    expect(entry.duration_seconds).toBe(120);
    expect(entry.created_at).toBeDefined();
    expect(entry.id).toBeDefined();
  });

  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app).get("/api/scores/me");
    expect(res.status).toBe(401);
  });
});
