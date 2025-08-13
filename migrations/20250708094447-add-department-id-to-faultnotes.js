module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("FaultNotes", "department_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Departments",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("FaultNotes", "department_id");
  },
};
