const path = require("path");
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
console.log("All deps:", JSON.stringify({...pkg.dependencies,...pkg.devDependencies}));
