export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(circle at 30% 50%, rgba(0,105,76,0.15), transparent 60%), radial-gradient(circle at 70% 30%, rgba(0,96,168,0.1), transparent 60%), hsl(var(--background))",
      }}
    >
      {children}
    </div>
  );
}
