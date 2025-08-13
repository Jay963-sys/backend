const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { Customer } = require("../models");
const { Fault } = require("../models");

// Get all customers (Protected)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const customers = await Customer.findAll({
      order: [["company", "ASC"]],
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
    });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching customers" });
  }
});

// Get customer by ID (Protected)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
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
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching customer" });
  }
});

// Create a customer (Admin only)
router.post("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can create customers" });
  }

  const {
    company,
    circuit_id,
    type,
    location,
    ip_address,
    pop_site,
    email,
    switch_info,
    owner,
  } = req.body;

  if (!company || !circuit_id || !ip_address || !pop_site) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  try {
    const customer = await Customer.create({
      company,
      circuit_id,
      type,
      location,
      ip_address,
      pop_site,
      email,
      switch_info,
      owner,
    });

    res.json({ message: "Customer created", customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating customer" });
  }
});

// Delete a customer (Admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can delete customers" });
  }

  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.destroy();
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error deleting customer" });
  }
});

// GET /api/customers/:id/history - Fetch all faults for a customer
router.get("/:id/history", authMiddleware, async (req, res) => {
  try {
    const faults = await Fault.findAll({
      where: { customer_id: req.params.id },
      order: [["createdAt", "DESC"]],
    });

    res.json(faults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching fault history" });
  }
});

// Update a customer (Admin only)
router.put("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can update customers" });
  }

  const {
    company,
    circuit_id,
    type,
    location,
    ip_address,
    pop_site,
    email,
    switch_info,
    owner,
  } = req.body;

  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Update only provided fields
    await customer.update({
      company: company ?? customer.company,
      circuit_id: circuit_id ?? customer.circuit_id,
      type: type ?? customer.type,
      location: location ?? customer.location,
      ip_address: ip_address ?? customer.ip_address,
      pop_site: pop_site ?? customer.pop_site,
      email: email ?? customer.email,
      switch_info: switch_info ?? customer.switch_info,
      owner: owner ?? customer.owner,
    });

    res.json({ message: "Customer updated", customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating customer" });
  }
});

module.exports = router;
