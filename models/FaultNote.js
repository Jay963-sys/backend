"use strict";

module.exports = (sequelize, DataTypes) => {
  const FaultNote = sequelize.define("FaultNote", {
    content: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  FaultNote.associate = (models) => {
    FaultNote.belongsTo(models.Fault, {
      foreignKey: "fault_id",
      as: "fault",
    });

    FaultNote.belongsTo(models.Department, {
      foreignKey: "department_id",
      as: "department",
    });
  };

  return FaultNote;
};
