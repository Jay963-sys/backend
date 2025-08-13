"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("Departments", [
      { name: "NOC", createdAt: new Date(), updatedAt: new Date() },
      { name: "Field Engineers", createdAt: new Date(), updatedAt: new Date() },
      {
        name: "Service Delivery",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Network Department",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("Departments", null, {});
  },
};
