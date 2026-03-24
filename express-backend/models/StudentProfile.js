const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema({
  parentId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  busId:         { type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null },
  name:          { type: String, required: true },
  department:    { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
  rollNumber:    { type: String, default: "" },
  contact:       { type: String, default: "" },
  address:       { type: String, default: "" },
  parentContact: { type: String, default: "" },
  photoUrl:      { type: String, default: "" },
  extraInfo:     { type: Object, default: {} },
});

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
