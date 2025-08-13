require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");

const User = require("./models/User");
const Department = require("./models/Department");
const Customer = require("./models/Customer");
const Fault = require("./models/Fault");
const FaultNote = require("./models/FaultNote");

const authMiddleware = require("./middleware/authMiddleware");

const app = express();

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const faultRoutes = require("./routes/faults");
app.use("/api/faults", faultRoutes);

const departmentRoutes = require("./routes/departments");
app.use("/api/departments", departmentRoutes);

const customerRoutes = require("./routes/customers");
app.use("/api/customers", customerRoutes);

const faultNoteRoutes = require("./routes/faultNotes");
app.use("/api/fault-notes", faultNoteRoutes);

const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);

const corsOptions = {
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("NOC Fault Logger API Running");
});

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    message: "Access granted to protected route",
    user: req.user,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected");
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }
});
