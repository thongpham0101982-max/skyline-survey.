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
  const rawUser = (process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.SMTP_PASS || "").trim().replace(/\s+/g, "");

  // Detect whether Gmail is explicitly configured
  const isGmail = rawUser.toLowerCase().includes("@gmail.com") || (process.env.SMTP_HOST || "").toLowerCase().includes("gmail");
  
  const host = isGmail ? "smtp.gmail.com" : (process.env.SMTP_HOST || "smtp.office365.com");
  const port = isGmail ? 465 : parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = isGmail ? true : (process.env.SMTP_SECURE === "true" || port === 465);

  const user = rawUser || (isGmail ? "dbclskl@gmail.com" : "bankhaothi@skylineschool.edu.vn");
  
  // App password for bankhaothi@skylineschool.edu.vn or dbclskl@gmail.com
  let pass = rawPass;
  if (!isGmail) {
    if (!pass || pass.length !== 16) {
      pass = "txhrphxggpnlbhsk";
    }
  } else if (!pass) {
    pass = "xhzihnqyiqqmdhat";
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
  const bccTargets = ["bankhaothi@skylineschool.edu.vn"];
  if (user && user.includes('@') && !bccTargets.includes(user)) {
    bccTargets.push(user);
  }
  if (Array.isArray(rawBcc)) {
    resolvedBcc = Array.from(new Set([...rawBcc, ...bccTargets]));
  } else if (rawBcc) {
    resolvedBcc = Array.from(new Set([rawBcc, ...bccTargets]));
  } else {
    resolvedBcc = bccTargets;
  }

  // Ensure replyTo goes to school official mailbox by default
  const resolvedReplyTo = cleanEmails(replyTo) || "bankhaothi@skylineschool.edu.vn";

  const mailOptions = {
    from: resolvedFrom,
    to: validTo,
    cc: cleanEmails(cc),
    bcc: resolvedBcc,
    subject,
    html,
    attachments,
    replyTo: resolvedReplyTo
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[mail.ts] Email sent successfully to:", validTo, "BCC:", resolvedBcc);
    return { success: true, ...info };
  } catch (error: any) {
    console.error("[mail.ts] Error sending email via SMTP:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send email", skipped: true };
  }
}
