// The customer-facing join/verify/ticket flow opts out of the marketing
// navbar and footer (see NavFooterWrapper), which also means it loses the
// flex wrapper those would have provided. Replace it here so each page's
// `flex-1 items-center justify-center` still has a full-height container to
// center within.
export default function CustomerFlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">{children}</div>
  );
}
