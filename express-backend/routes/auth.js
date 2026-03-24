const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const { authenticate, requireRole } = require("../middleware/auth");
const { sendPasswordResetEmail } = require("../services/email");

// Helper: safely convert to ObjectId or null
function toObjectId(val) {
    if (!val) return null;
    const s = String(val);
    return /^[0-9a-fA-F]{24}$/.test(s) && mongoose.Types.ObjectId.isValid(s) ? s : null;
}

// Helper: format user for API responses
function formatUser(u) {
    return {
        id: u._id,
        email: u.email,
        role: u.role,
        full_name: u.fullName,
        bus_id: u.busId || null,
        created_at: u.createdAt,
    };
}

// ── POST /auth/register ────────────────────────────────
// Create a new user account
router.post("/register", async (req, res) => {
  try {
    const { email, password, role = "parent", full_name = "", bus_id } = req.body;

    // Check if email already taken
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`[AUTH] ⚠️ Failed registration - Email already exists: ${email}`);
      return res.status(400).json({ detail: "Email already exists" });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      hashedPassword,
      role,
      fullName: full_name,
      busId: toObjectId(bus_id), // null by default for scanner accounts
    });
    console.log(`[AUTH] ✅ User registered: ${email} (Role: ${role})`);

    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── POST /auth/login ──────────────────────────────────
// Login and get a JWT token.
// Accepts JSON body { username, password } to stay compatible with frontend.
// Also accepts form-data for compatibility with OAuth2 form posts.
router.post("/login", async (req, res) => {
  try {
    // Support both JSON body and form-urlencoded (frontend sends JSON)
    const username = req.body.username || req.body.email;
    const password = req.body.password;

    const user = await User.findOne({ email: username });
    if (!user) {
      console.log(`[AUTH] ❌ Failed login attempt for unknown user: ${username}`);
      return res.status(401).json({ detail: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) {
      console.log(`[AUTH] ❌ Failed login attempt - Invalid password for: ${username}`);
      return res.status(401).json({ detail: "Invalid credentials" });
    }

    // Create JWT with email and role
    const token = jwt.sign(
      { sub: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    console.log(`[AUTH] 🔓 Login successful: ${user.fullName} (${user.email})`);

    res.json({ access_token: token, token_type: "bearer" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /auth/me ──────────────────────────────────────
// Get current authenticated user profile
router.get("/me", authenticate, (req, res) => {
  res.json(formatUser(req.user));
});

// ── GET /auth/users ───────────────────────────────────
// List all users (admin only)
router.get("/users", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map(formatUser));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /auth/users/:userId ────────────────────────────
// Get a specific user (admin only)
router.get("/users/:userId", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ detail: "User not found" });
    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── PUT /auth/users/:userId ────────────────────────────
// Update a user's basic info, role and optionally bus assignment (admin only)
router.put("/users/:userId", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ detail: "User not found" });

    if (req.body.email) user.email = req.body.email;
    if (req.body.full_name !== undefined) user.fullName = req.body.full_name;
    if (req.body.role) user.role = req.body.role;
    // Accept bus_id: null or an ObjectId string (null = 'none / use all faces')
    if ('bus_id' in req.body) user.busId = toObjectId(req.body.bus_id);

    // Password reset if provided
    if (req.body.password) {
        user.hashedPassword = await bcrypt.hash(req.body.password, 10);
    }

    await user.save();
    console.log(`[AUTH] 🔄 User profile updated for ${user.email} by Admin`);
    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ detail: "Error updating user: " + err.message });
  }
});

// ── POST /auth/forgot-password ────────────────────────
// Request a password reset email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ detail: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether the email exists
      return res.json({ message: "If that email is registered, a reset link has been sent." });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await PasswordReset.updateMany({ userId: user._id, used: false }, { used: true });

    await PasswordReset.create({ userId: user._id, token, expiresAt });

    // Send the email (fire-and-forget)
    sendPasswordResetEmail(email, token);

    console.log(`[AUTH] 📧 Password reset requested for ${email}`);
    res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── POST /auth/reset-password ─────────────────────────
// Reset password using the token from the email link
router.post("/reset-password", async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ detail: "Token and new_password are required" });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ detail: "Password must be at least 6 characters" });
    }

    const resetRecord = await PasswordReset.findOne({ token, used: false });
    if (!resetRecord) {
      return res.status(400).json({ detail: "Invalid or expired reset token" });
    }
    if (resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ detail: "Reset token has expired" });
    }

    // Update the user's password
    const user = await User.findById(resetRecord.userId);
    if (!user) return res.status(404).json({ detail: "User not found" });

    user.hashedPassword = await bcrypt.hash(new_password, 10);
    await user.save();

    // Mark token as used
    resetRecord.used = true;
    await resetRecord.save();

    console.log(`[AUTH] ✅ Password reset successful for ${user.email}`);
    res.json({ message: "Password has been reset successfully." });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
