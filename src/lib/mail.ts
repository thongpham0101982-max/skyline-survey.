import nodemailer from "nodemailer";

export async function sendEmail({ to, cc, bcc, subject, html, attachments, replyTo }: { to: string; cc?: string; bcc?: string; subject: string; html: string; attachments?: any[]; replyTo?: string }) {
  const host = process.env.SMTP_HOST || "smtp.office365.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER || "bankhaothi@skylineschool.edu.vn";
  const pass = process.env.SMTP_PASS || "Khaothi@2024";

  if (!user || !pass) {
    throw new Error("Missing SMTP credentials in environmental variables");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"Ban Khảo thí & ĐBCL" <bankhaothi@skylineschool.edu.vn>`,
    to,
    cc,
    bcc,
    subject,
    html,
    attachments,
    replyTo
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}
