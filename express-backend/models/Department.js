const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true }, // e.g. "CS", "BCA"
  fullName:    { type: String, default: "" },                  // e.g. "Computer Science"
  description: { type: String, default: "" },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model("Department", departmentSchema);
