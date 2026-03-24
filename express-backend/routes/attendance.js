const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const StudentProfile = require("../models/StudentProfile");
const Bus = require("../models/Bus");
const { authenticate, requireRole } = require("../middleware/auth");
const { notifyParentBoarding, notifyParentExit } = require("../services/notifyParent");

// ── POST /attendance/ — legacy force-mark ──────────────
router.post("/", authenticate, requireRole("admin", "scanner"), async (req, res) => {
  try {
    const record = await Attendance.create({
      studentId: req.body.student_id,
      busId: req.body.bus_id,
      status: req.body.status || "present_in_bus",
    });
    res.json(formatAttendance(record));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── POST /attendance/mark — idempotent smart marking ───
router.post("/mark", authenticate, requireRole("admin", "scanner"), async (req, res) => {
  try {
    const { student_id, bus_id } = req.body;

    // Look up student name for response
    const student = await StudentProfile.findById(student_id);
    const studentName = student ? student.name : "";

    // Always read bus state from DB (GPS-derived, not client-provided)
    const bus = await Bus.findById(bus_id);
    const busState = bus ? bus.state : "stopped";

    // Check for existing attendance record today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await Attendance.findOne({
      studentId: student_id,
      timestamp: { $gte: todayStart, $lte: todayEnd },
    }).sort({ timestamp: -1 });

    if (existing) {
      // ── Student already scanned today ──
      let newStatus = existing.status;

      if (busState === "on_the_way") {
        // Bus is moving — don't change anything
        console.log(`[ATTENDANCE] 🟡 Ignored scan for ${studentName} - Bus #${bus_id} is moving`);
        return res.json({
          id: existing._id,
          student_id: existing.studentId,
          bus_id: existing.busId,
          status: existing.status,
          timestamp: existing.timestamp,
          already_marked: true,
          student_name: studentName,
        });
      }

      if (busState === "arrived" || busState === "stopped") {
        // Bus has stopped — if student was present, auto-mark as exited
        if (existing.status === "present_in_bus") {
          newStatus = "exited_from_bus";
        }
        // If already exited, no change
      }

      const statusChanged = existing.status !== newStatus;

      if (statusChanged) {
        console.log(`[ATTENDANCE] ${newStatus === 'exited_from_bus' ? '🔴' : '🟢'} Status changed for ${studentName}: ${existing.status} -> ${newStatus} (Bus #${bus_id})`);
        existing.status = newStatus;
        existing.busId = bus_id; // update bus in case of cross-bus
        existing.timestamp = new Date();
        await existing.save();

        // Email notification to parent
        if (newStatus === "exited_from_bus") {
          notifyParentExit(student_id, bus_id);
        }
      } else {
        console.log(`[ATTENDANCE] 🔵 Already marked ${newStatus} for ${studentName} on Bus #${bus_id}`);
      }

      return res.json({
        id: existing._id,
        student_id: existing.studentId,
        bus_id: existing.busId,
        status: existing.status,
        timestamp: existing.timestamp,
        already_marked: !statusChanged,   // false when status just changed (e.g. exit scan)
        student_name: studentName,
      });
    }

    // ── First scan today — always mark as present (boarding) ──
    const record = await Attendance.create({
      studentId: student_id,
      busId: bus_id,
      status: "present_in_bus",
    });
    console.log(`[ATTENDANCE] 🟢 First scan for ${studentName}. Marked as present_in_bus (Bus #${bus_id})`);

    // Email notification to parent — student boarded
    notifyParentBoarding(student_id, bus_id);

    res.json({
      id: record._id,
      student_id: record.studentId,
      bus_id: record.busId,
      status: record.status,
      timestamp: record.timestamp,
      already_marked: false,
      student_name: studentName,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /attendance/today ──────────────────────────────
// Today's attendance with student names (admin/scanner)
router.get("/today", authenticate, requireRole("admin", "scanner"), async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      timestamp: { $gte: todayStart, $lte: todayEnd },
    }).sort({ timestamp: -1 });

    // Enrich with student info
    const results = [];
    for (const rec of records) {
      const student = await StudentProfile.findById(rec.studentId);
      results.push({
        id: rec._id,
        student_id: rec.studentId,
        bus_id: rec.busId,
        status: rec.status,
        timestamp: rec.timestamp,
        student_name: student ? student.name : `Student #${rec.studentId}`,
        roll_number: student ? student.rollNumber : "",
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /attendance/date/:date ─────────────────────────
// Attendance for a specific date (admin/scanner)
router.get("/date/:date", authenticate, requireRole("admin", "scanner"), async (req, res) => {
  try {
    const dateParam = new Date(req.params.date);
    if (isNaN(dateParam.getTime())) {
      return res.status(400).json({ detail: "Invalid date format. Use YYYY-MM-DD." });
    }

    const dayStart = new Date(dateParam);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateParam);
    dayEnd.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      timestamp: { $gte: dayStart, $lte: dayEnd },
    }).sort({ timestamp: -1 });

    // Enrich with student info
    const results = [];
    for (const rec of records) {
      const student = await StudentProfile.findById(rec.studentId);
      results.push({
        id: rec._id,
        student_id: rec.studentId,
        bus_id: rec.busId,
        status: rec.status,
        timestamp: rec.timestamp,
        student_name: student ? student.name : `Student #${rec.studentId}`,
        roll_number: student ? student.rollNumber : "",
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /attendance/student/:studentId ─────────────────
router.get("/student/:studentId", authenticate, async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.studentId })
      .sort({ timestamp: -1 });
    res.json(records.map(formatAttendance));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /attendance/bus/:busId ─────────────────────────
router.get("/bus/:busId", authenticate, async (req, res) => {
  try {
    const records = await Attendance.find({ busId: req.params.busId })
      .sort({ timestamp: -1 });
    res.json(records.map(formatAttendance));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Format helper ──────────────────────────────────────
function formatAttendance(a) {
  return {
    id: a._id,
    student_id: a.studentId,
    bus_id: a.busId,
    status: a.status,
    timestamp: a.timestamp,
  };
}

module.exports = router;
