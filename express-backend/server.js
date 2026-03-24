require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");

// Import route files
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const busRoutes = require("./routes/buses");
const attendanceRoutes = require("./routes/attendance");
const faceRoutes = require("./routes/face");
const notificationRoutes = require("./routes/notifications");
const departmentRoutes = require("./routes/departments");

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" })); // large limit for face descriptors
app.use(express.urlencoded({ extended: true })); // parse form-urlencoded (login form)

// ── Custom Logger Middleware ────────────────────────────
// app.use((req, res, next) => {
//   const start = Date.now();
//   const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
//   // Log request at start
//   console.log(`\n[${timestamp}] 📥  ${req.method} ${req.url}`);
//   if (Object.keys(req.body).length > 0) {
//     // Mask passwords and large face descriptors in logs
//     const safeBody = { ...req.body };
//     if (safeBody.password) safeBody.password = "***";
//     if (safeBody.descriptors) safeBody.descriptors = `[Array of ${safeBody.descriptors.length}]`;
//     console.log(`      Body:`, JSON.stringify(safeBody).substring(0, 200) + (JSON.stringify(safeBody).length > 200 ? '...' : ''));
//   }

//   // Hook into response finish to log the result
//   res.on('finish', () => {
//     const duration = Date.now() - start;
//     const status = res.statusCode;
//     const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'; // Red, Yellow, Green
//     const resetColor = '\x1b[0m';
//     console.log(`[${timestamp}] 📤  ${req.method} ${req.url} ${statusColor}${status}${resetColor} - ${duration}ms`);
//   });
  
//   next();
// });

// ── Routes ─────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/students", studentRoutes);
app.use("/buses", busRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/face", faceRoutes);
app.use("/notifications", notificationRoutes);
app.use("/departments", departmentRoutes);

// ── Root health check ──────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "IRIS API is running 🚌" });
});

// ── Start server ───────────────────────────────────────
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  await connectDB();

  // Seed default accounts if the DB is empty
  const User = require("./models/User");
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const defaultPassword = await bcrypt.hash("123456", 10);
    const seeds = [
      { email: "admin@mail.com", hashedPassword: defaultPassword, role: "admin", fullName: "System Administrator" },
      { email: "parent@mail.com", hashedPassword: defaultPassword, role: "parent", fullName: "Default Parent" },
      { email: "scanner@mail.com", hashedPassword: defaultPassword, role: "scanner", fullName: "System Scanner" },
    ];
    await User.insertMany(seeds);
    console.log("🌱 Default accounts created: admin@mail.com, parent@mail.com, scanner@mail.com (password: 123456)");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 IRIS backend running on http://0.0.0.0:${PORT} (listening on all interfaces)`);
  });
};

startServer();
