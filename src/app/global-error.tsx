'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2>Hệ thống tạm thời gián đoạn</h2>
          <p>Xin lỗi, đã xảy ra lỗi nghiêm trọng toàn cục.</p>
          <button onClick={() => reset()}>Thử lại</button>
        </div>
      </body>
    </html>
  );
}
