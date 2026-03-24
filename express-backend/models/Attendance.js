const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile", required: true },
  busId:     { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
  status:    { type: String, enum: ["present_in_bus", "exited_from_bus"], default: "present_in_bus" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
