"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Faults", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      ticket_number: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING,
      },
      location: {
        type: Sequelize.STRING,
      },
      owner: {
        type: Sequelize.STRING,
      },
      assigned_to: {
        type: Sequelize.STRING,
      },
      severity: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      pending_hours: {
        type: Sequelize.FLOAT,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "Customers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_to_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "Departments",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    await queryInterface.dropTable("Faults");
  },
};
