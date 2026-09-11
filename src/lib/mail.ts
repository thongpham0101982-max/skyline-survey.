import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  cc,
  bcc,
  subject,
  html,
  text,
  attachments,
  replyTo,
  from
}: {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
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
  if (!pass || pass === "txhrphxggpnlbhsk" || pass === "vpxgjprlqkwvdgmq") {
    pass = !isGmail ? "grtxdfbqfjnsfvvf" : "xhzihnqyiqqmdhat";
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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  // Helper to split and filter valid unique email strings
  const cleanEmails = (input?: string | string[]): string | string[] | undefined => {
    if (!input) return undefined;
    const rawList: string[] = Array.isArray(input) ? input : String(input).split(/[,;]/);
    const valid = rawList
      .flatMap(e => String(e || '').split(/[,;]/))
      .map(e => e.trim().replace(/^["']|["']$/g, ""))
      .filter(e => e && e.includes("@") && !e.includes(" ") && e.length > 5);
    
    const unique = Array.from(new Set(valid));
    if (unique.length === 0) return undefined;
    return unique.length === 1 && !Array.isArray(input) ? unique[0] : unique;
  };

  const validTo = cleanEmails(to);
  if (!validTo || (Array.isArray(validTo) && validTo.length === 0)) {
    console.warn("[mail.ts] No valid 'to' email address provided. Skipping send.");
    return { success: false, skipped: true, reason: "No valid recipient email" };
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

  // Determine existing primary recipients to avoid sending duplicate BCC copies
  const toList = Array.isArray(validTo) ? validTo : [validTo];
  const validCc = cleanEmails(cc);
  const ccList = validCc ? (Array.isArray(validCc) ? validCc : [validCc]) : [];
  const existingRecipients = new Set([...toList, ...ccList].map(e => e.toLowerCase()));

  // Ensure Ban Khảo thí always gets a BCC copy to track outgoing emails, except when they are already the primary recipient
  const rawBcc = cleanEmails(bcc);
  const bccList = rawBcc ? (Array.isArray(rawBcc) ? rawBcc : [rawBcc]) : [];
  const defaultBccTargets = ["bankhaothi@skylineschool.edu.vn"];
  
  const allBccCandidates = Array.from(new Set([...bccList, ...defaultBccTargets]));
  // Filter out any address already present in TO or CC to prevent duplicate emails
  const resolvedBcc = allBccCandidates.filter(b => !existingRecipients.has(b.toLowerCase()));

  const resolvedReplyTo = cleanEmails(replyTo);

  // Auto-generate plain-text fallback from HTML if not provided to maximize email deliverability and avoid spam classification
  const resolvedText = text || (html
    ? html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : undefined);

  const mailOptions: any = {
    from: resolvedFrom,
    to: validTo,
    subject,
    html,
  };

  if (resolvedText) mailOptions.text = resolvedText;
  if (validCc) mailOptions.cc = validCc;
  if (resolvedBcc && resolvedBcc.length > 0) mailOptions.bcc = resolvedBcc;
  if (resolvedReplyTo) mailOptions.replyTo = resolvedReplyTo;
  if (attachments && attachments.length > 0) mailOptions.attachments = attachments;

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[mail.ts] Email sent successfully to:", validTo, "BCC:", resolvedBcc, "MessageId:", info.messageId);
    if (info.rejected && info.rejected.length > 0) {
      console.warn("[mail.ts] Some recipients were rejected:", info.rejected);
    }
    return { success: true, ...info };
  } catch (error: any) {
    console.error("[mail.ts] Error sending email via SMTP:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send email", skipped: false };
  }
}
