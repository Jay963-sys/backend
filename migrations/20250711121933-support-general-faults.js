"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.addColumn("Faults", "general_type", {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn("Faults", "general_reference", {
        type: Sequelize.STRING,
        allowNull: true,
      }),
    ]);
  },

  down: async (queryInterface) => {
    await Promise.all([
      queryInterface.removeColumn("Faults", "general_type"),
      queryInterface.removeColumn("Faults", "general_reference"),
    ]);
  },
};
