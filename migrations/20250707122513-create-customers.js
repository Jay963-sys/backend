"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Customers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      company: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      circuit_id: {
        type: Sequelize.STRING,
      },
      type: {
        type: Sequelize.STRING,
      },
      location: {
        type: Sequelize.STRING,
      },
      ip_address: {
        type: Sequelize.STRING,
      },
      pop_site: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
      },
      switch_info: {
        type: Sequelize.STRING,
      },
      owner: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("Customers");
  },
};
