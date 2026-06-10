export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border shadow-sm mb-4 overflow-hidden">
            <img src="/logo.png" alt="DevTrack" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5 sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
