const fs = require("fs");
const path = "prisma/schema.prisma";
const content = fs.readFileSync(path, "utf8");
console.log("Original start:", content.substring(0, 100));
const updated = content.replace("generator client {", "generator client {\n  previewFeatures = [\"driverAdapters\"]");
console.log("Updated start:", updated.substring(0, 150));
fs.writeFileSync(path, updated);
console.log("File written!");
