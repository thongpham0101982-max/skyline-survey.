export default function HocSinhLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F8F8]">
      {children}
    </div>
  );
}
