"use strict";

module.exports = (sequelize, DataTypes) => {
  const Fault = sequelize.define("Fault", {
    ticket_number: DataTypes.STRING,
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: DataTypes.STRING,
    location: DataTypes.STRING,
    owner: DataTypes.STRING,
    severity: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pending_hours: DataTypes.FLOAT,
    resolvedAt: DataTypes.DATE,
    closedAt: DataTypes.DATE,
    resolved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    closed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // New fields
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    assigned_to_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    general_type: {
      type: DataTypes.STRING, // e.g., "Switch", "Link", "FTTH"
      allowNull: true,
    },
    general_reference: {
      type: DataTypes.STRING, // e.g., "Ajah POP", "Link ID 203", etc.
      allowNull: true,
    },
  });

  Fault.associate = (models) => {
    Fault.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      as: "customer",
    });

    Fault.belongsTo(models.Department, {
      foreignKey: "assigned_to_id",
      as: "department",
    });

    Fault.belongsTo(models.User, {
      as: "resolvedBy",
      foreignKey: "resolved_by",
    });

    Fault.belongsTo(models.User, {
      as: "closedBy",
      foreignKey: "closed_by",
    });

    Fault.hasMany(models.FaultNote, {
      foreignKey: "fault_id",
      as: "notes",
    });
  };

  return Fault;
};
