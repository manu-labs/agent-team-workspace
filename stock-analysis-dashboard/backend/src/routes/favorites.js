import { Router } from "express";

const router = Router();

// Get user favorites
// GET /api/favorites
router.get("/", async (_req, res, next) => {
  try {
    // TODO: implement favorites service (#33)
    res.json({ favorites: [] });
  } catch (err) {
    next(err);
  }
});

// Add a favorite
// POST /api/favorites/:ticker
router.post("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    // TODO: implement add favorite (#33)
    res.json({ ticker: ticker.toUpperCase(), message: "Added to favorites" });
  } catch (err) {
    next(err);
  }
});

// Remove a favorite
// DELETE /api/favorites/:ticker
router.delete("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    // TODO: implement remove favorite (#33)
    res.json({ ticker: ticker.toUpperCase(), message: "Removed from favorites" });
  } catch (err) {
    next(err);
  }
});

export default router;
