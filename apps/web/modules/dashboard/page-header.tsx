type PageHeaderProps = {
  title: string;
  description?: string;
  // Buttons or filters shown on the right
  actions?: React.ReactNode;
};

// The title block at the top of every dashboard page, so they all look alike.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-ink-mute">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
