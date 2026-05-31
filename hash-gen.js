const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('123456789', 10);
console.log(hash); 
