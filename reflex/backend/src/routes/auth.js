import { Router } from "express";
import { register, login } from "../services/auth.js";
import { listRiders, publicUser } from "../store/db.js";

const router = Router();

// POST /api/auth/register { name, phone, role, password }
router.post("/register", async (req, res) => {
  try {
    const { name, phone, role, password } = req.body;
    if (!["RETAILER", "DISPATCHER", "RIDER"].includes(role)) {
      return res.status(400).json({ error: "role must be RETAILER, DISPATCHER, or RIDER" });
    }
    const result = await register({ name, phone, role, password });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login { phone, password }
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const result = await login({ phone, password });
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get("/riders", (req, res) => {
  res.json(listRiders().map(publicUser));
});

export default router;
