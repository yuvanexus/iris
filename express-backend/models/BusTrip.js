const mongoose = require("mongoose");

const busTripSchema = new mongoose.Schema({
  busId:         { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
  departureTime: { type: Date, default: null },
  arrivalTime:   { type: Date, default: null },
  isActive:      { type: Boolean, default: true },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model("BusTrip", busTripSchema);
