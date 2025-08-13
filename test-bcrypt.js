const bcrypt = require("bcryptjs");

const hashed = "$2b$10$.q8/kjonQVmMQCmUSFiH0uA2mRaUS9.W.YMc7Hi5ule673y6bxvFm";
const password = "engineer1"; 

bcrypt.compare(password, hashed, (err, result) => {
  console.log("Match?", result); 
});
