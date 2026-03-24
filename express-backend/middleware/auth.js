const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── Verify JWT token and attach user to req ────────────
const authenticate = async (req, res, next) => {
  try {
    // Get token from "Authorization: Bearer <token>" header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ detail: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by email stored in token
    const user = await User.findOne({ email: decoded.sub });
    if (!user) {
      return res.status(401).json({ detail: "Invalid credentials" });
    }

    req.user = user; // attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }
};

// ── Check if user has one of the allowed roles ─────────
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ detail: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ detail: "Insufficient permissions" });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };
