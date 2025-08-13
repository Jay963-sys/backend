const jwt = require("jsonwebtoken");
const { User, Department } = require("../models");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch full user details from DB
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Department, as: "department" }],
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach to request
    req.user = {
      id: user.id,
      department_id: user.department_id,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = authMiddleware;
