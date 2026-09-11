import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  cc,
  bcc,
  subject,
  html,
  attachments,
  replyTo,
  from
}: {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  attachments?: any[];
  replyTo?: string;
  from?: string;
}) {
  const host = process.env.SMTP_HOST || "smtp.office365.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER || "bankhaothi@skylineschool.edu.vn";
  const pass = process.env.SMTP_PASS || "txhrphxggpnlbhsk";

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
      rejectUnauthorized: false,
    },
  });

  // Helper to filter valid email strings
  const cleanEmails = (input?: string | string[]): string | string[] | undefined => {
    if (!input) return undefined;
    if (Array.isArray(input)) {
      const valid = input.map(e => String(e || '').trim()).filter(e => e && e.includes('@'));
      return valid.length > 0 ? valid : undefined;
    }
    const s = String(input).trim();
    return s && s.includes('@') ? s : undefined;
  };

  const validTo = cleanEmails(to);
  if (!validTo || (Array.isArray(validTo) && validTo.length === 0)) {
    console.warn("[mail.ts] No valid 'to' email address provided. Skipping send.");
    return { skipped: true, reason: "No valid recipient email" };
  }

  // Ensure From header uses authenticated account email address in brackets to prevent SendAsDenied
  let resolvedFrom = `"BAN KHẢO THÍ & ĐBCL SKY-LINE" <${user}>`;
  if (from) {
    if (from.includes('<') && from.includes('>')) {
      const nameMatch = from.match(/^"?(.*?)"?\s*<.*?>$/);
      const displayName = nameMatch ? nameMatch[1] : "BAN KHẢO THÍ & ĐBCL SKY-LINE";
      resolvedFrom = `"${displayName}" <${user}>`;
    } else {
      resolvedFrom = `"${from}" <${user}>`;
    }
  }

  // Ensure Ban Khảo thí always gets a BCC copy to track all outgoing emails in their inbox
  const rawBcc = cleanEmails(bcc);
  let resolvedBcc: string | string[] | undefined = rawBcc;
  if (user && user.includes('@')) {
    if (Array.isArray(rawBcc)) {
      if (!rawBcc.includes(user)) resolvedBcc = [...rawBcc, user];
    } else if (rawBcc) {
      if (rawBcc !== user) resolvedBcc = [rawBcc, user];
    } else {
      resolvedBcc = user;
    }
  }

  const mailOptions = {
    from: resolvedFrom,
    to: validTo,
    cc: cleanEmails(cc),
    bcc: resolvedBcc,
    subject,
    html,
    attachments,
    replyTo: cleanEmails(replyTo) || user
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}
