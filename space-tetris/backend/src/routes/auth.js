import { Router } from "express";
import bcrypt from "bcrypt";
import { getDb } from "../db/index.js";
import { generateToken, authRequired } from "../middleware/auth.js";

const router = Router();
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const BCRYPT_ROUNDS = 10;

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: "Username must be 3-20 characters, alphanumeric and underscores only",
      });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = db
      .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
      .run(username, passwordHash);

    const user = { id: result.lastInsertRowid, username };
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error("[auth] Register error:", err.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const db = getDb();
    const user = db.prepare("SELECT id, username, password_hash FROM users WHERE username = ?").get(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = generateToken({ id: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("[auth] Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", authRequired, (req, res) => {
  res.json(req.user);
});

export default router;
