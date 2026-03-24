const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const StudentProfile = require("../models/StudentProfile");
const FaceLandmark = require("../models/FaceLandmark");
const Bus = require("../models/Bus");
const Attendance = require("../models/Attendance");
const { authenticate, requireRole } = require("../middleware/auth");

// Helper: convert a value to ObjectId, or null if invalid (handles old numeric IDs from frontend)
function toObjectId(val) {
    if (!val) return null;
    const strVal = String(val);
    if (/^[0-9a-fA-F]{24}$/.test(strVal) && mongoose.Types.ObjectId.isValid(strVal)) {
        return strVal;
    }
    return null;
}

// ── POST /face/register — composite registration ──────
// Creates/updates student profile + stores face encodings in one call
router.post("/register", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const data = req.body;

    // 1. Find or create student profile by roll number
    let profile = await StudentProfile.findOne({ rollNumber: data.roll_number });

    const extraInfo = { parent_name: data.parent_name || "" };

    if (profile) {
      // Update existing profile
      profile.name = data.name;
      profile.department = data.department || profile.department;
      profile.contact = data.contact || profile.contact;
      profile.address = data.address || profile.address;
      profile.parentContact = data.parent_contact || profile.parentContact;
      profile.extraInfo = extraInfo;
      if (data.parent_id) profile.parentId = toObjectId(data.parent_id);
      if (data.bus_id !== undefined) profile.busId = toObjectId(data.bus_id);
      await profile.save();
      console.log(`[FACE] 👤 Updated profile & face data for ${data.name} (Roll: ${data.roll_number})`);
    } else {
      // Create new profile
      profile = await StudentProfile.create({
        parentId: toObjectId(data.parent_id),
        name: data.name,
        rollNumber: data.roll_number,
        department: data.department || "",
        contact: data.contact || "",
        address: data.address || "",
        parentContact: data.parent_contact || "",
        busId: toObjectId(data.bus_id),
        extraInfo,
      });
      console.log(`[FACE] 👤 Created new profile & face data for ${data.name} (Roll: ${data.roll_number})`);
    }

    // 2. Delete old face encodings, then store new ones
    await FaceLandmark.deleteMany({ studentId: profile._id });
    const landmark = await FaceLandmark.create({
      studentId: profile._id,
      landmarksData: {},
      encoding: data.descriptors,
    });

    res.json({
      student_id: profile._id,
      landmark_id: landmark._id,
      message: "Registration successful",
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /face/encodings ────────────────────────────────
router.get("/encodings", authenticate, requireRole("admin", "scanner"), async (req, res) => {
  try {
    const { busId } = req.query;

    // Build student filter: if busId is provided and valid, scope to that bus only
    let studentFilter = {};
    const busObjectId = toObjectId(busId);
    if (busObjectId) {
      studentFilter = { busId: busObjectId };
      console.log(`[FACE] 🚌 Filtered encodings for busId: ${busObjectId}`);
    } else {
      console.log(`[FACE] ⚠️  No valid busId provided — returning ALL face encodings`);
    }

    // Fetch only relevant student profiles first, then look up their landmarks
    const students = await StudentProfile.find(studentFilter);
    const studentIds = students.map(s => s._id);

    const landmarks = await FaceLandmark.find({ studentId: { $in: studentIds } });
    const studentMap = Object.fromEntries(students.map(s => [String(s._id), s]));

    const results = [];
    for (const lm of landmarks) {
      const student = studentMap[String(lm.studentId)];
      if (student && lm.encoding) {
        results.push({
          student_id: student._id,
          name: student.name,
          roll_number: student.rollNumber,
          department: student.department,
          descriptors: lm.encoding,
        });
      }
    }

    console.log(`[FACE] 📡 Sent ${results.length} face encodings (${busObjectId ? `bus ${busObjectId}` : 'all buses'})`);
    res.json(results);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


// ── GET /face/landmarks/:studentId ─────────────────────
router.get("/landmarks/:studentId", async (req, res) => {
  try {
    const landmarks = await FaceLandmark.find({ studentId: req.params.studentId });
    res.json(
      landmarks.map((lm) => ({
        id: lm._id,
        student_id: lm.studentId,
        landmarks_data: lm.landmarksData,
        encoding: lm.encoding,
        created_at: lm.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── DELETE /face/landmarks/:landmarkId ─────────────────
router.delete("/landmarks/:landmarkId", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const lm = await FaceLandmark.findByIdAndDelete(req.params.landmarkId);
    if (!lm) return res.status(404).json({ detail: "Landmark not found" });
    res.json({ detail: "Deleted" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /face/admin/stats — dashboard metrics ──────────
router.get("/admin/stats", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const totalStudents = await StudentProfile.countDocuments();
    const totalLandmarks = await FaceLandmark.countDocuments();
    const totalBuses = await Bus.countDocuments();
    const studentsOnBus = await Attendance.countDocuments({ status: "present_in_bus" });
    const totalAttendance = await Attendance.countDocuments();

    res.json({
      total_students: totalStudents,
      total_landmarks: totalLandmarks,
      total_buses: totalBuses,
      students_on_bus: studentsOnBus,
      total_attendance: totalAttendance,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
