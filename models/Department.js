"use strict";

module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define("Department", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  Department.associate = (models) => {
    Department.hasMany(models.User, {
      foreignKey: "department_id",
      as: "users",
    });
    Department.hasMany(models.Fault, {
      foreignKey: "assigned_to_id",
      as: "faults",
    });
  };

  return Department;
};
