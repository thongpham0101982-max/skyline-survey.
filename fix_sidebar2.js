const fs = require("fs");
let c = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
// Add Quan ly Giao vien after Manage Classes
c = c.replace(
  '{ href: "/admin/classes", label: "Manage Classes" },',
  '{ href: "/admin/classes", label: "Manage Classes" },\n      { href: "/admin/teachers", label: "Qu\u1ea3n l\u00fd Gi\u00e1o vi\u00ean" },'
);
fs.writeFileSync("src/components/Sidebar.tsx", c, "utf8");
console.log("sidebar updated");
