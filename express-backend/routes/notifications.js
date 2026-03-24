const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// ── POST /notifications/ — create a notification ───────
router.post("/", async (req, res) => {
  try {
    const notif = await Notification.create({
      userId: req.body.user_id,
      title: req.body.title,
      message: req.body.message,
    });

    res.json(formatNotification(notif));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /notifications/user/:userId ────────────────────
// Get all notifications for a user. Optional ?unread_only=true
router.get("/user/:userId", async (req, res) => {
  try {
    const filter = { userId: req.params.userId };
    if (req.query.unread_only === "true") {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.json(notifications.map(formatNotification));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── PUT /notifications/:notifId/read ───────────────────
// Mark a notification as read
router.put("/:notifId/read", async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.notifId);
    if (!notif) return res.status(404).json({ detail: "Notification not found" });

    notif.isRead = true;
    await notif.save();

    res.json(formatNotification(notif));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── DELETE /notifications/:notifId ─────────────────────
router.delete("/:notifId", async (req, res) => {
  try {
    const notif = await Notification.findByIdAndDelete(req.params.notifId);
    if (!notif) return res.status(404).json({ detail: "Notification not found" });
    res.json({ detail: "Deleted" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Format helper ──────────────────────────────────────
function formatNotification(n) {
  return {
    id: n._id,
    user_id: n.userId,
    title: n.title,
    message: n.message,
    is_read: n.isRead,
    created_at: n.createdAt,
  };
}

module.exports = router;
