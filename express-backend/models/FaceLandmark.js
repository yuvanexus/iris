const mongoose = require("mongoose");

const faceLandmarkSchema = new mongoose.Schema({
  studentId:     { type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile", required: true },
  landmarksData: { type: Object, default: {} },     // raw landmark JSON
  encoding:      { type: Array, default: null },     // face descriptor arrays
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model("FaceLandmark", faceLandmarkSchema);
