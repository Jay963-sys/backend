module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Faults", "resolved_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("Faults", "closed_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Faults", "resolved_by");
    await queryInterface.removeColumn("Faults", "closed_by");
  },
};
