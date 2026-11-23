export default function AuthLayout({ children }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-paper px-4">
      {children}
    </div>
  );
}
