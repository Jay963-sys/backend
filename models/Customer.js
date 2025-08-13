"use strict";

module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define("Customer", {
    company: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    circuit_id: DataTypes.STRING,
    type: DataTypes.STRING,
    location: DataTypes.STRING,
    ip_address: DataTypes.STRING,
    pop_site: DataTypes.STRING,
    email: DataTypes.STRING,
    switch_info: DataTypes.STRING,
    owner: DataTypes.STRING,
  });

  Customer.associate = (models) => {
    Customer.hasMany(models.Fault, { foreignKey: "customer_id", as: "faults" });
  };

  return Customer;
};
