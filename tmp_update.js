var fs = require("fs");
var c = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
var r = c.replace(
  '{ href: "/admin/parents"',
  '{ href: "/admin/categories", label: "Danh muc KS" },\n      { href: "/admin/parents"'
);
fs.writeFileSync("src/components/Sidebar.tsx", r);
console.log("done");
