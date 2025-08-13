const express = require("express");
const router = express.Router();
const { Department } = require("../models");
const authMiddleware = require("../middleware/authMiddleware");

// Get all departments (Protected)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const departments = await Department.findAll({ order: [["name", "ASC"]] });
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new department (Admin only)
router.post("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Only admin can create departments" });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Department name is required" });
  }

  try {
    const department = await Department.create({ name });
    res.json({ message: "Department created", department });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update department name (Admin only)
router.put("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Only admin can update departments" });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Department name is required" });
  }

  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    department.name = name;
    await department.save();

    res.json({ message: "Department updated", department });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete department (Admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Only admin can delete departments" });
  }

  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    await department.destroy();
    res.json({ message: "Department deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
