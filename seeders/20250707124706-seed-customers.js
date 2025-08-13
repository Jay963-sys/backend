"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("Customers", [
      {
        company: "ABC Telecom",
        circuit_id: "CIR-001",
        type: "Fiber",
        location: "Lagos",
        ip_address: "192.168.1.1",
        pop_site: "POP-Lagos-1",
        email: "support@abctelecom.com",
        switch_info: "Cisco Switch 3850",
        owner: "John Doe",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        company: "XYZ Networks",
        circuit_id: "CIR-002",
        type: "Wireless",
        location: "Abuja",
        ip_address: "192.168.2.1",
        pop_site: "POP-Abuja-2",
        email: "contact@xyznetworks.com",
        switch_info: "MikroTik Router",
        owner: "Jane Smith",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("Customers", null, {});
  },
};
