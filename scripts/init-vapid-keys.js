const webpush = require("web-push");
const fs = require("fs");

const vapidKeys = webpush.generateVAPIDKeys();
console.log("Generated VAPID keys:");
console.log("Public Key:", vapidKeys.publicKey);

const envLines = `
# Web Push VAPID Keys for SSM PWA
NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"
VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"
VAPID_SUBJECT="mailto:support@skylineschool.edu.vn"
`;

[".env", ".env.local"].forEach((f) => {
  if (fs.existsSync(f)) {
    let cur = fs.readFileSync(f, "utf8");
    if (!cur.includes("VAPID_PUBLIC_KEY")) {
      fs.appendFileSync(f, envLines, "utf8");
      console.log(`Appended VAPID keys to ${f}`);
    }
  } else {
    fs.writeFileSync(f, envLines.trim() + "\n", "utf8");
    console.log(`Created ${f} with VAPID keys`);
  }
});
