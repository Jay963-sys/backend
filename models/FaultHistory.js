"use strict";

module.exports = (sequelize, DataTypes) => {
  const FaultHistory = sequelize.define("FaultHistory", {
    fault_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    previous_status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    new_status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    changed_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  FaultHistory.associate = (models) => {
    FaultHistory.belongsTo(models.Fault, {
      foreignKey: "fault_id",
      as: "fault",
    });
    FaultHistory.belongsTo(models.User, {
      foreignKey: "changed_by",
      as: "user",
    });
  };

  return FaultHistory;
};
