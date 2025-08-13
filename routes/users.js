const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middleware/authMiddleware");
const { User, Department } = require("../models");

// Admin check middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

// Create new user (Admin only)
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  const { username, email, password, role, department_id } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Username, Email, and Password are required." });
  }

  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || "user",
      department_id: department_id || null,
    });

    const { password: _, ...userData } = user.toJSON();
    res.json({ message: "User created successfully", user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating user." });
  }
});

// Get all users (excluding soft-deleted)
router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { is_active: true },
      include: [{ model: Department, as: "department" }],
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user by ID
router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: Department, as: "department" }],
      attributes: { exclude: ["password"] },
    });
    if (!user || !user.is_active) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || !user.is_active)
      return res.status(404).json({ message: "User not found" });

    const { username, email, role, department_id } = req.body;

    user.username = username || user.username;
    user.email = email || user.email;
    user.role = role || user.role;
    user.department_id = department_id !== undefined ? department_id : null;

    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Server error updating user" });
  }
});

// Soft delete user (set is_active = false)
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || !user.is_active)
      return res.status(404).json({ message: "User not found" });

    user.is_active = false;
    await user.save();

    res.json({ message: "User deactivated (soft deleted) successfully" });
  } catch (err) {
    console.error("Error soft-deleting user:", err);
    res.status(500).json({ message: "Server error deleting user" });
  }
});

module.exports = router;
