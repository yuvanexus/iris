const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email:          { type: String, required: true, unique: true },
  hashedPassword: { type: String, required: true },
  role:           { type: String, enum: ["admin", "scanner", "parent"], default: "parent" },
  fullName:       { type: String, default: "" },
  busId:          { type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null },
  createdAt:      { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);

