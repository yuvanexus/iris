const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const Bus = require("../models/Bus");
const { notifyStudentBoarded, notifyStudentExited, notifyBusArrived } = require("./email");

/**
 * Look up the parent's email for a student.
 * Returns { parentEmail, studentName, busNumber, routeName } or null.
 */
async function getStudentParentInfo(studentId, busId) {
  const student = await StudentProfile.findById(studentId);
  if (!student || !student.parentId) return null;

  const parent = await User.findById(student.parentId);
  if (!parent || !parent.email) return null;

  const bus = busId ? await Bus.findById(busId) : null;

  return {
    parentEmail: parent.email,
    studentName: student.name,
    busNumber: bus ? bus.busNumber : "Unknown",
    routeName: bus ? bus.routeName : "",
  };
}


async function notifyParentBoarding(studentId, busId) {
  const info = await getStudentParentInfo(studentId, busId);
  if (!info) return;
  notifyStudentBoarded(info.parentEmail, info.studentName, info.busNumber, info.routeName);
}


async function notifyParentExit(studentId, busId) {
  const info = await getStudentParentInfo(studentId, busId);
  if (!info) return;
  notifyStudentExited(info.parentEmail, info.studentName, info.busNumber, info.routeName);
}


async function notifyParentsBusArrived(busId) {
  const bus = await Bus.findById(busId);
  if (!bus) return;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const Attendance = require("../models/Attendance");

  // Find all students who were on this bus today (both present and just-exited)
  const records = await Attendance.find({
    busId,
    timestamp: { $gte: todayStart, $lte: todayEnd },
  });

  const notifiedParents = new Set();

  for (const rec of records) {
    const student = await StudentProfile.findById(rec.studentId);
    if (!student || !student.parentId) continue;

    // Avoid duplicate emails if parent has multiple children on same bus
    const parentKey = student.parentId.toString();
    if (notifiedParents.has(parentKey)) continue;
    notifiedParents.add(parentKey);

    const parent = await User.findById(student.parentId);
    if (!parent || !parent.email) continue;

    notifyBusArrived(parent.email, student.name, bus.busNumber, bus.routeName);
  }
}

module.exports = {
  notifyParentBoarding,
  notifyParentExit,
  notifyParentsBusArrived,
};
