"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Faults", "assigned_to");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("Faults", "assigned_to", {
      type: Sequelize.STRING,
    });
  },
};
