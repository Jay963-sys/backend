const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  User,
  Fault,
  Department,
  Customer,
  FaultNote,
  FaultHistory,
} = require("../models");
const { Op } = require("sequelize");
const { Sequelize } = require("sequelize");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

function calculateSeverity(pendingHours) {
  if (pendingHours < 4) return "Low";
  if (pendingHours < 12) return "Medium";
  if (pendingHours < 24) return "High";
  return "Critical";
}

function getDateRange(filter) {
  const now = new Date();
  let startDate;

  switch (filter) {
    case "day":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "year":
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      return null;
  }

  return { start: startDate, end: now };
}

const getFilteredFaults = async (req) => {
  const {
    status,
    department_id,
    severity,
    search,
    timeRange = "week",
    customStart,
    customEnd,
  } = req.query;
  const whereClause = {};

  if (status && status !== "all") {
    whereClause.status = status;
  }

  if (department_id && department_id !== "all") {
    whereClause.assigned_to_id = department_id;
  }

  let customerIds = [];

  if (search) {
    const customers = await Customer.findAll({
      where: {
        [Op.or]: [
          { company: { [Op.like]: `%${search}%` } },
          { circuit_id: { [Op.like]: `%${search}%` } },
        ],
      },
      attributes: ["id"],
    });
    customerIds = customers.map((c) => c.id);
  }

  if (search) {
    whereClause[Op.or] = [
      { ticket_number: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { type: { [Op.like]: `%${search}%` } },
    ];
    if (customerIds.length > 0) {
      whereClause[Op.or].push({ customer_id: { [Op.in]: customerIds } });
    }
  }

  let dateFilter = {};
  if (customStart && customEnd) {
    dateFilter = {
      createdAt: {
        [Op.between]: [new Date(customStart), new Date(customEnd)],
      },
    };
  } else {
    const now = new Date();
    if (timeRange === "day") {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { createdAt: { [Op.gte]: startOfDay } };
    } else if (timeRange === "week") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      dateFilter = { createdAt: { [Op.gte]: sevenDaysAgo } };
    } else if (timeRange === "month") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      dateFilter = { createdAt: { [Op.gte]: thirtyDaysAgo } };
    } else if (timeRange === "year") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      dateFilter = { createdAt: { [Op.gte]: oneYearAgo } };
    }
  }

  // ✅ This now runs regardless of whether customStart/customEnd was used
  const faults = await Fault.findAll({
    where: { ...whereClause, ...dateFilter },
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: Department,
        as: "department",
        attributes: ["id", "name"],
      },
      {
        model: Customer,
        as: "customer",
        attributes: [
          "id",
          "company",
          "circuit_id",
          "type",
          "location",
          "ip_address",
          "pop_site",
          "email",
          "switch_info",
          "owner",
        ],
      },
      { model: User, as: "resolvedBy", attributes: ["id", "username"] },
      { model: User, as: "closedBy", attributes: ["id", "username"] },
    ],
  });

  const result = faults.map((fault) => {
    const json = fault.toJSON();
    const endTime =
      fault.status === "Resolved" && fault.resolvedAt
        ? new Date(fault.resolvedAt)
        : fault.status === "Closed" && fault.closedAt
        ? new Date(fault.closedAt)
        : new Date();

    const created = new Date(fault.createdAt);
    const diffHours = (endTime - created) / (1000 * 60 * 60);
    json.pending_hours = parseFloat(diffHours.toFixed(1));

    if (fault.status === "Open" || fault.status === "In Progress") {
      json.severity = calculateSeverity(diffHours);
    } else {
      json.severity = fault.severity;
    }

    return json;
  });

  return severity && severity !== "all"
    ? result.filter((f) => f.severity === severity)
    : result;
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    const faults = await getFilteredFaults(req);
    res.json(faults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching faults" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const {
    description,
    type,
    location,
    owner,
    assigned_to_id,
    status,
    pending_hours,
    customer_id,
  } = req.body;

  if (!description || !status || !customer_id || !assigned_to_id) {
    return res.status(400).json({
      message: "Description, Status, Customer, and Department are required.",
    });
  }

  try {
    const severity = calculateSeverity(pending_hours || 0);

    const fault = await Fault.create({
      description,
      type,
      location,
      owner,
      severity,
      status,
      pending_hours,
      customer_id,
      assigned_to_id,
    });

    res.json({ message: "Fault created successfully", fault });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating fault" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const fault = await Fault.findByPk(req.params.id, {
      include: { model: Department, as: "department" },
    });
    if (!fault) return res.status(404).json({ message: "Fault not found" });

    const {
      description,
      type,
      location,
      owner,
      assigned_to_id,
      status,
      pending_hours,
      customer_id,
      department_id,
      note,
    } = req.body;

    if (description) fault.description = description;
    if (type) fault.type = type;
    if (location) fault.location = location;
    if (owner) fault.owner = owner;
    if (assigned_to_id) fault.assigned_to_id = assigned_to_id;
    if (customer_id) fault.customer_id = customer_id;
    if (pending_hours != null) {
      fault.pending_hours = pending_hours;
      fault.severity = calculateSeverity(pending_hours);
    }

    let previousStatus = fault.status;
    let previousDept = fault.Department?.name;
    let historyLogged = false;

    // Handle status change
    if (status && status !== fault.status) {
      fault.status = status;

      if (status === "Resolved") {
        fault.resolvedAt = new Date();
        fault.resolved_by = req.user.id;
        const diffMs = fault.resolvedAt - fault.createdAt;
        const calculatedPendingHours = diffMs / (1000 * 60 * 60);
        fault.pending_hours = calculatedPendingHours.toFixed(1);
        fault.severity = calculateSeverity(calculatedPendingHours);
      }

      if (status === "Closed") {
        fault.closedAt = new Date();
        fault.closed_by = req.user.id;
        const diffMs = fault.closedAt - fault.createdAt;
        const calculatedPendingHours = diffMs / (1000 * 60 * 60);
        fault.pending_hours = calculatedPendingHours.toFixed(1);
        fault.severity = calculateSeverity(calculatedPendingHours);
      }

      await FaultHistory.create({
        fault_id: fault.id,
        previous_status: previousStatus,
        new_status: status,
        changed_by: req.user.id,
        note: note || null,
      });

      historyLogged = true;
    }

    // ✅ Handle department transfer
    if (department_id && department_id !== fault.department_id) {
      const newDept = await Department.findByPk(department_id);
      const newDeptName = newDept?.name || "Unknown";

      await FaultHistory.create({
        fault_id: fault.id,
        previous_status: `Transferred from ${previousDept || "Unknown"}`,
        new_status: `Transferred to ${newDeptName}`,
        changed_by: req.user.id,
        note: `Transferred to ${newDeptName}`,
      });

      fault.department_id = department_id;
      historyLogged = true;
    }

    await fault.save();

    res.json({
      message: "Fault updated" + (historyLogged ? " and logged" : ""),
      fault,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating fault" });
  }
});

// GET /api/faults/:id/details - Get full fault details with customer and notes
router.get("/:id/details", authMiddleware, async (req, res) => {
  try {
    const fault = await Fault.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: Department, as: "department" },
        {
          model: FaultNote,
          as: "notes",
          include: [{ model: Department, as: "department" }],
        },
        {
          model: User,
          as: "resolvedBy",
          attributes: ["id", "username"],
        },
        {
          model: User,
          as: "closedBy",
          attributes: ["id", "username"],
        },
      ],
    });

    if (!fault) return res.status(404).json({ message: "Fault not found" });

    const created = new Date(fault.createdAt);
    const now = new Date();
    const diffHours = Math.abs(now - created) / 36e5;

    fault.pending_hours =
      fault.status === "Resolved" || fault.status === "Closed"
        ? "Resolved"
        : parseFloat(diffHours.toFixed(1));

    if (fault.status === "Resolved" || fault.status === "Closed") {
      // Keep existing severity
    } else {
      if (diffHours < 4) fault.severity = "Low";
      else if (diffHours < 12) fault.severity = "Medium";
      else if (diffHours < 24) fault.severity = "High";
      else fault.severity = "Critical";
    }

    res.json({ fault, notes: fault.notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching fault details" });
  }
});

router.post("/:id/notes", authMiddleware, async (req, res) => {
  try {
    const fault = await Fault.findByPk(req.params.id);
    if (!fault) return res.status(404).json({ message: "Fault not found" });

    const note = await FaultNote.create({
      fault_id: fault.id,
      content: req.body.content,
      created_by: req.user.id,
      department_id: req.user.department_id,
    });

    res.status(201).json(note);
  } catch (err) {
    console.error("Error adding note:", err);
    res.status(500).json({ message: "Failed to add note" });
  }
});

// GET /api/faults/:id/history - Get fault status change history
router.get("/:id/history", authMiddleware, async (req, res) => {
  try {
    const { FaultHistory, User } = require("../models");
    const history = await FaultHistory.findAll({
      where: { fault_id: req.params.id },
      include: [{ model: User, as: "user", attributes: ["id", "username"] }],
      order: [["createdAt", "DESC"]],
    });

    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching fault history" });
  }
});

router.get("/export", authMiddleware, async (req, res) => {
  try {
    const { status, department_id, severity, search } = req.query;
    const whereClause = {};
    const { Op } = require("sequelize");

    if (status && status !== "all") whereClause.status = status;
    if (department_id && department_id !== "all")
      whereClause.assigned_to_id = department_id;
    if (severity && severity !== "all") whereClause.severity = severity;

    let customerIds = [];
    if (search) {
      const customers = await Customer.findAll({
        where: {
          [Op.or]: [
            { company: { [Op.like]: `%${search}%` } },
            { circuit_id: { [Op.like]: `%${search}%` } },
          ],
        },
        attributes: ["id"],
      });
      customerIds = customers.map((c) => c.id);
    }

    if (search) {
      whereClause[Op.or] = [
        { ticket_number: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { type: { [Op.like]: `%${search}%` } },
      ];
      if (customerIds.length > 0) {
        whereClause[Op.or].push({ customer_id: { [Op.in]: customerIds } });
      }
    }

    const faults = await Fault.findAll({
      where: whereClause,
      include: [
        { model: Department, as: "department", attributes: ["name"] },
        {
          model: Customer,
          as: "customer",
          attributes: ["company", "circuit_id", "location"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Faults");

    // Define Header
    worksheet.columns = [
      { header: "Ticket #", key: "ticket_number", width: 12 },
      { header: "Description", key: "description", width: 30 },
      { header: "Type", key: "type", width: 15 },
      { header: "Location", key: "location", width: 20 },
      { header: "Owner", key: "owner", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Severity", key: "severity", width: 12 },
      { header: "Pending (hrs)", key: "pending_hours", width: 15 },
      { header: "Department", key: "department", width: 18 },
      { header: "Customer", key: "customer", width: 25 },
      { header: "Circuit ID", key: "circuit_id", width: 18 },
      { header: "Logged At", key: "createdAt", width: 22 },
    ];

    // Add Rows
    faults.forEach((fault) => {
      worksheet.addRow({
        ticket_number: fault.ticket_number || fault.id,
        description: fault.description,
        type: fault.type,
        location: fault.location,
        owner: fault.owner,
        status: fault.status,
        severity: fault.severity,
        pending_hours: fault.pending_hours,
        department: fault.department?.name,
        customer: fault.customer?.company,
        circuit_id: fault.customer?.circuit_id,
        createdAt: new Date(fault.createdAt).toLocaleString(),
      });
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=faults_export.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({ message: "Failed to export faults" });
  }
});

router.get("/metrics", authMiddleware, async (req, res) => {
  try {
    const { timeRange } = req.query;
    const dateRange = getDateRange(timeRange);

    const where = dateRange
      ? { createdAt: { [Op.between]: [dateRange.start, dateRange.end] } }
      : {};

    const faults = await Fault.findAll({
      where,
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
        },
      ],
    });

    const now = new Date();

    const summary = {
      total: faults.length,
      statusCounts: {
        Open: 0,
        "In Progress": 0,
        Resolved: 0,
        Closed: 0,
      },
      severityCounts: {
        Low: 0,
        Medium: 0,
        High: 0,
        Critical: 0,
      },
      departmentCounts: {},
    };

    for (let fault of faults) {
      summary.statusCounts[fault.status]++;

      let endTime = now;
      if (fault.status === "Resolved" && fault.resolvedAt)
        endTime = new Date(fault.resolvedAt);
      else if (fault.status === "Closed" && fault.closedAt)
        endTime = new Date(fault.closedAt);

      const pendingHours =
        (endTime - new Date(fault.createdAt)) / (1000 * 60 * 60);

      const severity =
        fault.status === "Open" || fault.status === "In Progress"
          ? calculateSeverity(pendingHours)
          : fault.severity;

      if (summary.severityCounts[severity] !== undefined) {
        summary.severityCounts[severity]++;
      }

      const deptName = fault.department?.name || "Unassigned";
      summary.departmentCounts[deptName] =
        (summary.departmentCounts[deptName] || 0) + 1;
    }

    res.json(summary);
  } catch (err) {
    console.error("Metrics error:", err);
    res.status(500).json({ message: "Error generating metrics" });
  }
});

router.get("/charts", authMiddleware, async (req, res) => {
  try {
    const { timeRange } = req.query;
    const dateRange = getDateRange(timeRange);

    const where = dateRange
      ? { createdAt: { [Op.between]: [dateRange.start, dateRange.end] } }
      : {};

    const faults = await Fault.findAll({
      where,
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
        },
      ],
    });

    const now = new Date();

    const severityData = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };

    const departmentData = {};

    const days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });
    const faultsPerDay = {};
    days.forEach((day) => {
      faultsPerDay[day] = 0;
    });

    for (let fault of faults) {
      let endTime = now;
      if (fault.status === "Resolved" && fault.resolvedAt) {
        endTime = new Date(fault.resolvedAt);
      } else if (fault.status === "Closed" && fault.closedAt) {
        endTime = new Date(fault.closedAt);
      }

      const created = new Date(fault.createdAt);
      const pendingHours = (endTime - created) / (1000 * 60 * 60);

      const severity =
        fault.status === "Open" || fault.status === "In Progress"
          ? calculateSeverity(pendingHours)
          : fault.severity;

      if (severityData[severity] !== undefined) {
        severityData[severity]++;
      }

      const dept = fault.department?.name || "Unassigned";
      departmentData[dept] = (departmentData[dept] || 0) + 1;

      const faultDate = created.toISOString().split("T")[0];
      if (faultsPerDay[faultDate] !== undefined) {
        faultsPerDay[faultDate]++;
      }
    }

    res.json({
      severityData,
      departmentData,
      faultsPerDay,
    });
  } catch (err) {
    console.error("Charts error:", err);
    res.status(500).json({ message: "Error generating chart data" });
  }
});

router.post("/export/pdf", authMiddleware, async (req, res) => {
  try {
    const faults = await getFilteredFaults(req);
    const { chartImage } = req.body;

    const doc = new PDFDocument({ margin: 30, size: "A4" });

    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          "Content-Length": Buffer.byteLength(pdfData),
          "Content-Type": "application/pdf",
          "Content-Disposition":
            "attachment;filename=faults_report_with_charts.pdf",
        })
        .end(pdfData);
    });

    // Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("NOC Fault Report", { align: "center" });
    doc.moveDown(1);

    // Insert chart image if present
    if (chartImage) {
      const base64Data = chartImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      doc.image(buffer, { fit: [500, 250], align: "center" });
      doc.moveDown(1);
    }

    // Table Headers
    const headers = [
      { label: "Ticket", x: 30 },
      { label: "Company", x: 120 },
      { label: "Status", x: 270 },
      { label: "Severity", x: 350 },
      { label: "Created", x: 430 },
    ];

    let y = doc.y;
    doc.font("Helvetica-Bold").fontSize(11);
    headers.forEach((h) => doc.text(h.label, h.x, y));
    y += 15;

    // Divider line under headers
    doc
      .moveTo(30, y)
      .lineTo(570, y)
      .lineWidth(0.5)
      .strokeColor("#000")
      .stroke();
    y += 5;

    // Table Rows
    doc.font("Helvetica").fontSize(10);
    faults.forEach((fault) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      doc.text(fault.ticket_number || "-", headers[0].x, y, { width: 90 });
      doc.text(fault.customer?.company || "-", headers[1].x, y, { width: 140 });
      doc.text(fault.status || "-", headers[2].x, y, { width: 80 });
      doc.text(fault.severity || "-", headers[3].x, y, { width: 70 });
      doc.text(
        fault.createdAt ? new Date(fault.createdAt).toLocaleString() : "-",
        headers[4].x,
        y,
        { width: 130 }
      );

      y += 18;

      // Light row separator
      doc
        .moveTo(30, y - 3)
        .lineTo(570, y - 3)
        .lineWidth(0.3)
        .strokeColor("#ccc")
        .stroke();
    });

    doc.end();
  } catch (error) {
    console.error("PDF Export Error:", error);
    res
      .status(500)
      .json({ message: "Failed to export faults as PDF with charts." });
  }
});

// GET faults assigned to the logged-in user's department
router.get("/department/dashboard", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "user") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { status, severity, search, timeRange, customStart, customEnd } =
      req.query;

    const where = {
      assigned_to_id: user.department_id,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    // 🔁 Add createdAt filtering based on timeRange
    if (customStart && customEnd) {
      where.createdAt = {
        [Op.between]: [new Date(customStart), new Date(customEnd)],
      };
    } else if (timeRange && timeRange !== "all") {
      const now = new Date();
      let fromDate;

      switch (timeRange) {
        case "day":
          fromDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case "week":
          fromDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          fromDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "year":
          fromDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (fromDate) {
        where.createdAt = { [Op.gte]: fromDate };
      }
    }

    if (search) {
      where[Op.or] = [
        { ticket_number: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { "$customer.company$": { [Op.like]: `%${search}%` } },
        { "$customer.circuit_id$": { [Op.like]: `%${search}%` } },
      ];
    }

    const faults = await Fault.findAll({
      where,
      include: [
        { model: Customer, as: "customer" },
        { model: Department, as: "department" },
        { model: User, as: "resolvedBy" },
        { model: User, as: "closedBy" },
        { model: FaultNote, as: "notes" },
      ],
      order: [["createdAt", "DESC"]],
    });

    const now = new Date();
    const enriched = faults.map((fault) => {
      const created = new Date(fault.createdAt);
      const diffHours = Math.abs(now - created) / 36e5;

      const pending_hours =
        fault.status === "Resolved" || fault.status === "Closed"
          ? "Resolved"
          : parseFloat(diffHours.toFixed(1));

      let calculatedSeverity = fault.severity;
      if (fault.status !== "Resolved" && fault.status !== "Closed") {
        if (diffHours < 4) calculatedSeverity = "Low";
        else if (diffHours < 12) calculatedSeverity = "Medium";
        else if (diffHours < 24) calculatedSeverity = "High";
        else calculatedSeverity = "Critical";
      }

      return {
        ...fault.toJSON(),
        pending_hours,
        severity: calculatedSeverity,
      };
    });

    const filtered =
      severity && severity !== "all"
        ? enriched.filter((f) => f.severity === severity)
        : enriched;

    res.json(filtered);
  } catch (err) {
    console.error("Error loading department faults:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /faults/department/metrics
router.get("/department/metrics", authMiddleware, async (req, res) => {
  try {
    const departmentId = req.user.department_id;

    const statuses = ["Open", "In Progress", "Resolved", "Closed"];
    const counts = {};

    for (const status of statuses) {
      const count = await Fault.count({
        where: {
          assigned_to_id: departmentId,
          status,
        },
      });
      counts[status] = count;
    }

    res.json({
      open: counts["Open"] || 0,
      in_progress: counts["In Progress"] || 0,
      resolved: counts["Resolved"] || 0,
      closed: counts["Closed"] || 0,
    });
  } catch (err) {
    console.error("Error in /department/metrics:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /faults/department/charts
router.get("/department/charts", authMiddleware, async (req, res) => {
  try {
    const departmentId = req.user.department_id;
    console.log("User department ID:", departmentId);

    const faults = await Fault.findAll({
      where: { assigned_to_id: departmentId },
      attributes: ["id", "createdAt", "status"], // You only need what's required
    });

    const now = new Date();
    const severityCounts = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };

    faults.forEach((fault) => {
      const created = new Date(fault.createdAt);
      const diffHours = Math.abs(now - created) / 36e5;

      if (fault.status === "Resolved" || fault.status === "Closed") {
        // Optional: count them separately or skip if you don't want them in chart
        return;
      }

      if (diffHours < 4) severityCounts.Low++;
      else if (diffHours < 12) severityCounts.Medium++;
      else if (diffHours < 24) severityCounts.High++;
      else severityCounts.Critical++;
    });

    // Convert to array format like frontend expects
    const severity = Object.keys(severityCounts).map((key) => ({
      severity: key,
      count: severityCounts[key],
    }));

    // Keep status and trend same as before
    const statusCountsRaw = await Fault.findAll({
      where: { assigned_to_id: departmentId },
      attributes: [
        "status",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      group: ["status"],
    });
    const status = statusCountsRaw.map((s) => s.get({ plain: true }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const trendRaw = await Fault.findAll({
      where: {
        assigned_to_id: departmentId,
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
      attributes: [
        [Sequelize.fn("DATE", Sequelize.col("createdAt")), "date"],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      group: [Sequelize.fn("DATE", Sequelize.col("createdAt"))],
      order: [[Sequelize.fn("DATE", Sequelize.col("createdAt")), "ASC"]],
    });

    const trend = trendRaw.map((t) => t.get({ plain: true }));

    res.json({ severity, status, trend });
  } catch (err) {
    console.error("Error in /department/charts:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/faults/:id/transfer - Transfer a fault to another department
router.post("/:id/transfer", authMiddleware, async (req, res) => {
  try {
    const fault = await Fault.findByPk(req.params.id);
    if (!fault) {
      return res.status(404).json({ message: "Fault not found" });
    }

    const { department_id, note } = req.body;

    // Check if new department exists
    const newDept = await Department.findByPk(department_id);
    if (!newDept) {
      return res.status(400).json({ message: "Invalid department" });
    }

    const oldDeptId = fault.assigned_to_id;
    const oldDept = await Department.findByPk(oldDeptId);

    // Transfer
    fault.assigned_to_id = department_id;
    await fault.save();

    // Log transfer
    await FaultHistory.create({
      fault_id: fault.id,
      previous_status: `Transferred from ${oldDept?.name || "Unknown"}`,
      new_status: `Transferred to ${newDept.name}`,
      changed_by: req.user.id,
      note: note || `Transferred to ${newDept.name}`,
    });

    res.json({ message: "Fault transferred successfully", fault });
  } catch (err) {
    console.error("Transfer error:", err);
    res.status(500).json({ message: "Failed to transfer fault" });
  }
});

// GET /api/departments - Return all departments except Admin
router.get("/departments", authMiddleware, async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: {
        name: { [Op.ne]: "Admin" },
      },
      attributes: ["id", "name"],
    });
    res.json(departments);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
});

router.post("/general", authMiddleware, async (req, res) => {
  try {
    const {
      description,
      general,
      general_type,
      location,
      owner,
      severity,
      status,
      assigned_to_id,
      type,
    } = req.body;

    const fault = await Fault.create({
      description,
      general,
      general_type,
      location,
      owner,
      severity,
      status: status || "Open",
      assigned_to_id,
      type,
    });

    res.status(201).json(fault);
  } catch (err) {
    console.error("Error creating general fault:", err);
    res.status(500).json({ error: "Failed to create general fault" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const fault = await Fault.findByPk(req.params.id);
    if (!fault) return res.status(404).json({ message: "Fault not found" });

    await fault.destroy();
    res.json({ message: "Fault deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete fault" });
  }
});

module.exports = router;
