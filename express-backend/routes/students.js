const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const StudentProfile = require("../models/StudentProfile");
const { authenticate, requireRole } = require("../middleware/auth");

// Helper: strictly convert to ObjectId or null
function toObjectId(val) {
    if (!val) return null;
    const strVal = String(val);
    if (/^[0-9a-fA-F]{24}$/.test(strVal) && mongoose.Types.ObjectId.isValid(strVal)) {
        return strVal;
    }
    return null;
}

// ── POST /students/profile ─────────────────────────────
// Create or update a student profile (matched by roll_number for the current parent)
router.post("/profile", authenticate, async (req, res) => {
  try {
    const data = req.body;
    const parentId = req.user._id;

    // Try to find existing profile by roll number for this parent
    let profile = await StudentProfile.findOne({
      parentId,
      rollNumber: data.roll_number,
    });

    if (profile) {
      // Update existing fields
      profile.name = data.name || profile.name;
      profile.department = data.department !== undefined ? toObjectId(data.department) : profile.department;
      profile.contact = data.contact ?? profile.contact;
      profile.address = data.address ?? profile.address;
      profile.parentContact = data.parent_contact ?? profile.parentContact;
      profile.photoUrl = data.photo_url ?? profile.photoUrl;
      profile.busId = data.bus_id !== undefined ? toObjectId(data.bus_id) : profile.busId;
      profile.extraInfo = data.extra_info ?? profile.extraInfo;
      await profile.save();
    } else {
      // Create new profile
      profile = await StudentProfile.create({
        parentId,
        name: data.name,
        department: toObjectId(data.department),
        rollNumber: data.roll_number || "",
        contact: data.contact || "",
        address: data.address || "",
        parentContact: data.parent_contact || "",
        photoUrl: data.photo_url || "",
        busId: toObjectId(data.bus_id),
        extraInfo: data.extra_info || {},
      });
    }

    res.json({
      id: profile._id,
      parent_id: profile.parentId,
      name: profile.name,
      department: profile.department,
      contact: profile.contact,
      address: profile.address,
      roll_number: profile.rollNumber,
      parent_contact: profile.parentContact,
      photo_url: profile.photoUrl,
      bus_id: profile.busId,
      extra_info: profile.extraInfo,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /students/profile ──────────────────────────────
// List all student profiles for the current parent
router.get("/profile", authenticate, async (req, res) => {
  try {
    const profiles = await StudentProfile.find({ parentId: req.user._id }).populate("department");
    res.json(profiles.map(formatProfile));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /students/profile/:studentId ───────────────────
// Get a specific student profile by ID
router.get("/profile/:studentId", async (req, res) => {
  try {
    const profile = await StudentProfile.findById(req.params.studentId).populate("department");
    if (!profile) return res.status(404).json({ detail: "Profile not found" });
    res.json(formatProfile(profile));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /students/ ─────────────────────────────────────
// List all students in the system
router.get("/", authenticate, async (req, res) => {
  try {
    const profiles = await StudentProfile.find().populate("department");
    res.json(profiles.map(formatProfile));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── PATCH /students/:studentId ─────────────────────────
// Admin: partially update any student
router.patch("/:studentId", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const data = req.body;
    const profile = await StudentProfile.findById(req.params.studentId);
    if (!profile) return res.status(404).json({ detail: "Student not found" });

    // Update only provided fields
    if (data.name !== undefined) profile.name = data.name;
    if (data.department !== undefined) profile.department = toObjectId(data.department);
    if (data.contact !== undefined) profile.contact = data.contact;
    if (data.address !== undefined) profile.address = data.address;
    if (data.roll_number !== undefined) profile.rollNumber = data.roll_number;
    if (data.parent_contact !== undefined) profile.parentContact = data.parent_contact;
    if (data.photo_url !== undefined) profile.photoUrl = data.photo_url;
    if (data.bus_id !== undefined) profile.busId = toObjectId(data.bus_id);
    if (data.parent_id !== undefined) profile.parentId = toObjectId(data.parent_id);

    await profile.save();
    res.json(formatProfile(profile));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Helper to format profile for response ──────────────
function formatProfile(p) {
  return {
    id: p._id,
    parent_id: p.parentId,
    name: p.name,
    department: p.department?.name || p.department || "",
    department_id: p.department?._id || (mongoose.Types.ObjectId.isValid(String(p.department)) ? p.department : null),
    contact: p.contact,
    address: p.address,
    roll_number: p.rollNumber,
    parent_contact: p.parentContact,
    photo_url: p.photoUrl,
    bus_id: p.busId,
    extra_info: p.extraInfo,
  };
}

module.exports = router;
