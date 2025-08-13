const { User } = require("../models");

exports.softDeleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Set is_active to false (soft delete)
    user.is_active = false;
    await user.save();

    res.json({ message: "User deactivated successfully" });
  } catch (err) {
    console.error("Error deactivating user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
