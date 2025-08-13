const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// Import from index.js to ensure associations are applied
const { FaultNote, Fault } = require("../models");

// Get all notes for a specific fault
router.get("/:faultId", authMiddleware, async (req, res) => {
  try {
    const notes = await FaultNote.findAll({
      where: { fault_id: req.params.faultId },
      order: [["createdAt", "ASC"]],
    });
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a note for a fault
router.post("/", authMiddleware, async (req, res) => {
  const { fault_id, note } = req.body;

  if (!fault_id || !note) {
    return res.status(400).json({ message: "Fault ID and note are required." });
  }

  try {
    const fault = await Fault.findByPk(fault_id);
    if (!fault) {
      return res.status(404).json({ message: "Fault not found." });
    }

    const newNote = await FaultNote.create({
      fault_id,
      content: note,
      created_by: req.user.username,
    });

    res.json({ message: "Note added", note: newNote });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
