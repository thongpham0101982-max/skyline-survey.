import * as QRCode from 'qrcode';

export function getBaseUrl(): string {
  const custom = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'https://ssm.skylineschool.edu.vn';
  return custom.replace(/\/$/, '');
}

/**
 * Đường dẫn xác thực số hóa trường tồn (Lifelong e-Portfolio / Verification URL)
 * Không thay đổi qua các năm học, gắn liền với Mã HS chính từ khi nhập học đến khi thành Cựu học sinh.
 */
export function getStudentVerifyUrl(studentCode: string): string {
  const base = getBaseUrl();
  return `${base}/profile/verify/${encodeURIComponent(studentCode.trim())}`;
}

/**
 * Tạo QR Code dạng Data URL (PNG base64) với độ phân giải cao phục vụ in ấn bìa A4
 */
export async function renderStudentQrCodeDataUrl(studentCode: string, width = 450): Promise<string> {
  const url = getStudentVerifyUrl(studentCode);
  return QRCode.toDataURL(url, {
    width,
    margin: 1,
    color: {
      dark: '#003B3A', // Mã màu Deep Pine thương hiệu Sky-Line
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H', // Chuẩn phục hồi lỗi cao nhất (30%)
  });
}

/**
 * Tạo QR Code dạng SVG vector
 */
export async function renderStudentQrCodeSvg(studentCode: string): Promise<string> {
  const url = getStudentVerifyUrl(studentCode);
  return QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    color: {
      dark: '#003B3A',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
}
