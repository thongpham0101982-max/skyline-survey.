const fs = require('fs');
const filePath = 'prisma/schema.prisma';
let schema = fs.readFileSync(filePath, 'utf8');

// 1. Add fields to model Notification
const oldNotification = `model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  isRead    Boolean  @default(false)
  link      String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}`;

const newNotification = `model Notification {
  id           String    @id @default(cuid())
  userId       String
  title        String
  message      String
  isRead       Boolean   @default(false)
  link         String?
  createdAt    DateTime  @default(now())
  type         String?   @default("INFORMATION")
  category     String?   @default("GENERAL")
  priority     String?   @default("NORMAL")
  sourceModule String?
  sourceId     String?
  expiredAt    DateTime?
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, isRead])
}`;

if (schema.includes('link      String?\n  createdAt DateTime @default(now())')) {
  schema = schema.replace(oldNotification, newNotification);
  console.log('Notification model updated in schema');
} else {
  // Try CRLF
  const oldNotificationCRLF = oldNotification.replace(/\n/g, '\r\n');
  const newNotificationCRLF = newNotification.replace(/\n/g, '\r\n');
  schema = schema.replace(oldNotificationCRLF, newNotificationCRLF);
  console.log('Notification model updated (CRLF) in schema');
}

// 2. Add pushSubscriptions and userPreference to User model if not present
if (!schema.includes('pushSubscriptions')) {
  schema = schema.replace(
    'competencyImportBatches         ImportBatch[]',
    'competencyImportBatches         ImportBatch[]\n  pushSubscriptions                PushSubscription[]\n  userPreference                   UserPreference?'
  );
  console.log('User model relations added');
}

// 3. Append PushSubscription and UserPreference models to end of schema
if (!schema.includes('model PushSubscription')) {
  const extraModels = `

model PushSubscription {
  id         String   @id @default(cuid())
  userId     String
  endpoint   String   @unique
  p256dh     String
  auth       String
  userAgent  String?
  deviceType String?  @default("MOBILE")
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model UserPreference {
  id                  String   @id @default(cuid())
  userId              String   @unique
  morningBriefEnabled Boolean  @default(true)
  morningBriefTime    String   @default("07:00")
  pushNotifications   Boolean  @default(true)
  themePreference     String   @default("LIGHT")
  updatedAt           DateTime @updatedAt

  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
`;
  schema += extraModels;
  console.log('PushSubscription and UserPreference models appended');
}

fs.writeFileSync(filePath, schema, 'utf8');
console.log('prisma/schema.prisma updated successfully');
