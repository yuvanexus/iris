const mongoose = require("mongoose");

const busLocationSchema = new mongoose.Schema({
  busId:     { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
  latitude:  { type: Number, required: true },
  longitude: { type: Number, required: true },
  speed:     { type: Number, default: 0 },
  isStopped: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BusLocation", busLocationSchema);
