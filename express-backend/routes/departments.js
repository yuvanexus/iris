const express = require("express");
const router = express.Router();
const Department = require("../models/Department");
const { authenticate, requireRole } = require("../middleware/auth");

// ── GET /departments/ — list all departments ───────────
// Public (no auth needed, so registration dropdown can load them)
router.get("/", async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments.map(formatDept));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /departments/:id — get single department ───────
router.get("/:id", async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ detail: "Department not found" });
    res.json(formatDept(dept));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── POST /departments/ — create department (admin) ─────
router.post("/", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const dept = await Department.create({
      name: req.body.name,
      fullName: req.body.full_name || "",
      description: req.body.description || "",
    });
    res.json(formatDept(dept));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── PUT /departments/:id — update department (admin) ───
router.put("/:id", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ detail: "Department not found" });

    if (req.body.name !== undefined) dept.name = req.body.name;
    if (req.body.full_name !== undefined) dept.fullName = req.body.full_name;
    if (req.body.description !== undefined) dept.description = req.body.description;
    await dept.save();

    res.json(formatDept(dept));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── DELETE /departments/:id — delete department (admin) ─
router.delete("/:id", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ detail: "Department not found" });
    res.json({ detail: "Deleted" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Format helper ──────────────────────────────────────
function formatDept(d) {
  return {
    id: d._id,
    name: d.name,
    full_name: d.fullName,
    description: d.description,
    created_at: d.createdAt,
  };
}

module.exports = router;
