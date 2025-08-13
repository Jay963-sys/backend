"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("FaultHistories", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      fault_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Faults",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      previous_status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      new_status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      note: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("FaultHistories");
  },
};
