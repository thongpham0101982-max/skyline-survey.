import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
  replyTo?: string;
  from?: string;
  throwOnError?: boolean;
  enableAuditBcc?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
  provider?: string;
  failover?: boolean;
  [key: string]: any;
}

/**
 * Normalizes email subjects across the project to adhere to the standard Sky-line SMS branding.
 * - Replaces [Sky-Line SIS] or [Sky-line SIS] with [Sky-line SMS]
 * - Unifies prefixes: [Skyline - Dự Giờ] -> [Sky-line SMS - Dự Giờ], [Sky-Line HĐTN] -> [Sky-line SMS - HĐTN], etc.
 * - Ensures every outgoing email subject starts with [Sky-line SMS]
 */
export function formatEmailSubject(rawSubject?: string): string {
  if (!rawSubject || typeof rawSubject !== "string") {
    return "[Sky-line SMS] Thông báo từ Hệ thống";
  }

  let s = rawSubject.trim();

  // 1. Direct replacement of any variant of Sky-Line SIS
  s = s.replace(/\[Sky-?Line\s+SIS\]/gi, "[Sky-line SMS]");

  // 2. Standardize known subsystem prefixes to [Sky-line SMS - ...]
  s = s.replace(/\[Sky-?line\s*[-–]?\s*Dự\s*Giờ\s*Đột\s*Xuất\]/gi, "[Sky-line SMS - Dự Giờ Đột Xuất]");
  s = s.replace(/\[Sky-?line\s*[-–]?\s*Dự\s*Giờ\]/gi, "[Sky-line SMS - Dự Giờ]");
  s = s.replace(/\[Skyline\s*-\s*ESL\s*Observation\]/gi, "[Sky-line SMS - ESL Observation]");
  s = s.replace(/\[Sky-?Line\s+HĐTN\]/gi, "[Sky-line SMS - HĐTN]");
  s = s.replace(/\[Sky-?Line\s+Bồi\s+Dưỡng\]/gi, "[Sky-line SMS - Bồi Dưỡng]");
  s = s.replace(/\[Sky-?Line\s+Preschool\]/gi, "[Sky-line SMS - Mầm Non]");
  s = s.replace(/\[Sky-?Line-?Approval\]/gi, "[Sky-line SMS - Xét Duyệt]");
  s = s.replace(/\[Sky-?Line\s+Survey\]/gi, "[Sky-line SMS]");
  s = s.replace(/\[Skyline\s+School\]/gi, "[Sky-line SMS]");
  s = s.replace(/\[Skyline\s+Test\]/gi, "[Sky-line SMS - Test]");

  // 3. If it starts with [Sky-Line] or [Skyline], change to [Sky-line SMS]
  s = s.replace(/^\[Sky-?Line\]\s*/i, "[Sky-line SMS] ");
  s = s.replace(/^\[Skyline\]\s*/i, "[Sky-line SMS] ");

  // 4. Ensure exact casing if it starts with [Sky-line SMS]
  if (/^\[Sky-?Line\s+SMS\]/i.test(s)) {
    s = s.replace(/^\[Sky-?Line\s+SMS\]\s*/i, "[Sky-line SMS] ");
  } else if (!/^\[Sky-line SMS/i.test(s)) {
    // If it doesn't already have [Sky-line SMS prefix, prepend it
    s = `[Sky-line SMS] ${s}`;
  }

  return s;
}

export async function sendEmail({
  to,
  cc,
  bcc,
  subject,
  html,
  text,
  attachments,
  replyTo,
  from,
  throwOnError = false,
  enableAuditBcc = false
}: SendEmailOptions): Promise<SendEmailResult> {
  const rawUser = (process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.SMTP_PASS || "").trim().replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");

  const user = rawUser || "bankhaothi@skylineschool.edu.vn";
  
  // Detect domain
  const isSkylineDomain = user.toLowerCase().includes("@skylineschool.edu.vn") || user.toLowerCase().includes("@skyline.edu.vn");
  const isGmail = !isSkylineDomain && (user.toLowerCase().includes("@gmail.com") || (process.env.SMTP_HOST || "").toLowerCase().includes("gmail"));

  // Enforce Office 365 configuration for Skyline domain (port 587 STARTTLS)
  const host = isSkylineDomain ? "smtp.office365.com" : (isGmail ? "smtp.gmail.com" : (process.env.SMTP_HOST || "smtp.office365.com"));
  const port = isSkylineDomain ? 587 : (isGmail ? 465 : parseInt(process.env.SMTP_PORT || "587", 10));
  const secure = isSkylineDomain ? false : (isGmail ? true : (process.env.SMTP_SECURE === "true" || port === 465));

  let pass = rawPass;
  if (!pass || pass === "vpxgjprlqkwvdgmq" || pass === "grtxdfbqfjnsfvvf") {
    pass = !isGmail ? "tpcynmmfltbbjfsz" : "xhzihnqyiqqmdhat";
  }

  const createTransporter = (h: string, p: number, s: boolean, u: string, pwd: string) => {
    return nodemailer.createTransport({
      host: h,
      port: p,
      secure: s,
      requireTLS: !s,
      auth: {
        user: u,
        pass: pwd,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  };

  const transporter = createTransporter(host, port, secure, user, pass);

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
    if (throwOnError) throw new Error("No valid recipient email address provided");
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

  const toList = Array.isArray(validTo) ? validTo : [validTo];
  const validCc = cleanEmails(cc);
  const ccList = validCc ? (Array.isArray(validCc) ? validCc : [validCc]) : [];
  const existingRecipients = new Set([...toList, ...ccList].map(e => e.toLowerCase()));

  const rawBcc = cleanEmails(bcc);
  const bccList = rawBcc ? (Array.isArray(rawBcc) ? rawBcc : [rawBcc]) : [];
  const defaultBccTargets = enableAuditBcc ? ["bankhaothi@skylineschool.edu.vn"] : [];
  const resolvedBcc = Array.from(new Set([...bccList, ...defaultBccTargets])).filter(b => !existingRecipients.has(b.toLowerCase()));

  const resolvedReplyTo = cleanEmails(replyTo) || "bankhaothi@skylineschool.edu.vn";

  // Auto-generate plain-text fallback from HTML if not provided to maximize deliverability
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

  const resolvedSubject = formatEmailSubject(subject);

  const mailOptions: any = {
    from: resolvedFrom,
    to: validTo,
    subject: resolvedSubject,
    html,
  };

  if (resolvedText) mailOptions.text = resolvedText;
  if (resolvedReplyTo) mailOptions.replyTo = resolvedReplyTo;
  if (validCc) mailOptions.cc = validCc;
  if (resolvedBcc && resolvedBcc.length > 0) mailOptions.bcc = resolvedBcc;
  if (attachments && attachments.length > 0) mailOptions.attachments = attachments;

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[mail.ts] Email sent successfully to:", validTo, "MessageId:", info.messageId);
    if (info.rejected && info.rejected.length > 0) {
      console.warn("[mail.ts] Some recipients were rejected:", info.rejected);
    }
    return { ...info, success: true, messageId: info.messageId, provider: "OFFICE365" };
  } catch (error: any) {
    console.error("[mail.ts] Primary SMTP error:", error?.message || error);
    
    // Auto-failover to backup Gmail if primary Office 365 fails
    let failoverErrorMsg = "";
    if (!isGmail) {
      try {
        console.log("[mail.ts] Attempting auto-failover to backup Gmail SMTP...");
        const backupUser = (process.env.BACKUP_SMTP_USER || "dbclskl@gmail.com").trim();
        const backupPass = (process.env.BACKUP_SMTP_PASS || "xhzihnqyiqqmdhat").trim();
        const backupTransporter = createTransporter("smtp.gmail.com", 465, true, backupUser, backupPass);
        const backupMailOptions = {
          ...mailOptions,
          from: `"BAN KHẢO THÍ & ĐBCL SKY-LINE" <${backupUser}>`,
          replyTo: "bankhaothi@skylineschool.edu.vn"
        };
        const backupInfo = await backupTransporter.sendMail(backupMailOptions);
        console.log("[mail.ts] Auto-failover SUCCESS via Gmail Relay to:", validTo, "MessageId:", backupInfo.messageId);
        return { ...backupInfo, success: true, failover: true, provider: "GMAIL_RELAY", messageId: backupInfo.messageId };
      } catch (backupError: any) {
        failoverErrorMsg = backupError?.message || String(backupError);
        console.error("[mail.ts] Backup Gmail SMTP also failed:", failoverErrorMsg);
      }
    }

    if (throwOnError) {
      throw error;
    }
    const combinedError = failoverErrorMsg 
      ? `${error?.message || "Primary SMTP error"} (Dự phòng Gmail: ${failoverErrorMsg})`
      : (error?.message || "Failed to send email");
    return { success: false, error: combinedError, skipped: false };
  }
}
