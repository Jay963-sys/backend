const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { Department } = require("../models");

// Login Route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({
      where: { username, is_active: true },
      include: [{ model: Department, as: "department" }],
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid credentials or inactive account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      department_id: user.department_id,
      department: user.department,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Register Route
router.post("/register", async (req, res) => {
  const { username, email, password, role, department_id } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists." });
    }

    // 👇 Hash the password properly
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      department_id: department_id || null,
      is_active: true,
    });

    return res.json({ message: "User registered successfully.", user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
