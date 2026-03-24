const mongoose = require("mongoose");

const busSchema = new mongoose.Schema({
  busNumber:        { type: String, required: true, unique: true },
  routeName:        { type: String, default: "" },
  driverName:       { type: String, default: "" },
  driverContact:    { type: String, default: "" },
  capacity:         { type: Number, default: 40 },
  isActive:         { type: Boolean, default: true },
  state:            { type: String, enum: ["on_the_way", "stopped", "arrived"], default: "stopped" },
  // ── Destination geofence ──────────────────────────────
  destinationLat:    { type: Number, default: null },  // school/destination latitude
  destinationLng:    { type: Number, default: null },  // school/destination longitude
  destinationRadius: { type: Number, default: 100 },   // auto-arrive trigger radius in metres
});

module.exports = mongoose.model("Bus", busSchema);
