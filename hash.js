const bcrypt = require("bcryptjs");

bcrypt.hash("user123", 10).then((hash) => {
  console.log("Hashed password:", hash);
});
