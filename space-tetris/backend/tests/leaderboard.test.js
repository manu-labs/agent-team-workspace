import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, clearDb, insertScoreDirectly } from "./helpers.js";

let app;

beforeAll(() => {
  app = createTestApp();
});

beforeEach(() => {
  clearDb();
});

/** Helper: register a user and submit one score via API. Returns { token, userId }. */
async function registerAndSubmitScore(username, score, extras = {}) {
  const regRes = await request(app)
    .post("/api/auth/register")
    .send({ username, password: "password123" });
  const { token, user } = regRes.body;

  await request(app)
    .post("/api/scores")
    .set("Authorization", `Bearer ${token}`)
    .send({ score, lines_cleared: 0, level: 1, duration_seconds: 60, ...extras });

  return { token, userId: user.id };
}

// ---------------------------------------------------------------------------
// GET /api/leaderboard (alltime, default)
// ---------------------------------------------------------------------------
describe("GET /api/leaderboard", () => {
  it("returns empty leaderboard when no scores exist", async () => {
    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toEqual([]);
    expect(res.body.period).toBe("alltime");
  });

  it("returns scores with username, score, and rank fields", async () => {
    await registerAndSubmitScore("solo_player", 5000);

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toHaveLength(1);
    const entry = res.body.leaderboard[0];
    expect(entry.username).toBe("solo_player");
    expect(entry.score).toBe(5000);
    expect(entry.rank).toBe(1);
    expect(entry.lines_cleared).toBeDefined();
    expect(entry.level).toBeDefined();
    expect(entry.created_at).toBeDefined();
  });

  it("returns scores sorted by score descending", async () => {
    await registerAndSubmitScore("low_player", 100);
    await registerAndSubmitScore("high_player", 9000);
    await registerAndSubmitScore("mid_player", 5000);

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(200);
    const scores = res.body.leaderboard.map((e) => e.score);
    expect(scores[0]).toBe(9000);
    expect(scores[1]).toBe(5000);
    expect(scores[2]).toBe(100);
  });

  it("assigns sequential rank numbers starting at 1", async () => {
    await registerAndSubmitScore("alpha", 3000);
    await registerAndSubmitScore("beta", 1000);
    await registerAndSubmitScore("gamma", 7000);

    const res = await request(app).get("/api/leaderboard");
    const board = res.body.leaderboard;

    expect(board[0].rank).toBe(1);
    expect(board[1].rank).toBe(2);
    expect(board[2].rank).toBe(3);
  });

  it("includes scores from multiple different users", async () => {
    await registerAndSubmitScore("user_x", 2500);
    await registerAndSubmitScore("user_y", 4000);

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(200);
    const usernames = res.body.leaderboard.map((e) => e.username);
    expect(usernames).toContain("user_x");
    expect(usernames).toContain("user_y");
  });

  it("multiple scores from same user all appear", async () => {
    const { token } = await registerAndSubmitScore("multi_scorer", 1000);
    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 3000, lines_cleared: 30, level: 3 });

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(200);
    const userScores = res.body.leaderboard.filter((e) => e.username === "multi_scorer");
    expect(userScores).toHaveLength(2);
  });

  it("defaults to alltime period when no query param", async () => {
    const res = await request(app).get("/api/leaderboard");
    expect(res.body.period).toBe("alltime");
  });
});

// ---------------------------------------------------------------------------
// GET /api/leaderboard?period=daily|weekly|alltime
// ---------------------------------------------------------------------------
describe("GET /api/leaderboard?period=", () => {
  let recentUserId;

  beforeEach(async () => {
    // Submit a recent score via API (within daily + weekly + alltime windows)
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "recent_player", password: "password123" });
    recentUserId = res.body.user.id;
    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${res.body.token}`)
      .send({ score: 5000, lines_cleared: 50, level: 5 });

    // Insert an old score directly — 60 days ago (outside daily + weekly, inside alltime)
    insertScoreDirectly({
      userId: recentUserId,
      score: 9999,
      created_at: "2020-01-01 00:00:00",
    });
  });

  it("alltime returns all scores including old ones", async () => {
    const res = await request(app).get("/api/leaderboard?period=alltime");

    expect(res.status).toBe(200);
    expect(res.body.period).toBe("alltime");
    const scores = res.body.leaderboard.map((e) => e.score);
    expect(scores).toContain(5000);
    expect(scores).toContain(9999);
  });

  it("daily filter returns only scores from the last 24 hours", async () => {
    const res = await request(app).get("/api/leaderboard?period=daily");

    expect(res.status).toBe(200);
    expect(res.body.period).toBe("daily");
    const scores = res.body.leaderboard.map((e) => e.score);
    expect(scores).toContain(5000);   // recent — should appear
    expect(scores).not.toContain(9999); // old — should be excluded
  });

  it("weekly filter returns only scores from the last 7 days", async () => {
    const res = await request(app).get("/api/leaderboard?period=weekly");

    expect(res.status).toBe(200);
    expect(res.body.period).toBe("weekly");
    const scores = res.body.leaderboard.map((e) => e.score);
    expect(scores).toContain(5000);    // recent — should appear
    expect(scores).not.toContain(9999); // old — should be excluded
  });

  it("daily results are still sorted by score descending", async () => {
    const { token } = await registerAndSubmitScore("daily_user2", 1000);
    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ score: 7500 });

    const res = await request(app).get("/api/leaderboard?period=daily");
    const scores = res.body.leaderboard.map((e) => e.score);

    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it("unknown period value behaves like alltime (no date filter)", async () => {
    const res = await request(app).get("/api/leaderboard?period=monthly");

    expect(res.status).toBe(200);
    // Both recent and old scores should appear (no filter applied for unknown periods)
    expect(res.body.leaderboard.length).toBeGreaterThanOrEqual(2);
  });

  it("explicit alltime param returns same as no param", async () => {
    const noParam = await request(app).get("/api/leaderboard");
    const withParam = await request(app).get("/api/leaderboard?period=alltime");

    expect(noParam.body.leaderboard.length).toBe(withParam.body.leaderboard.length);
  });
});
