import * as React from "react";
import { cn } from "cn";

export interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface-2/40 px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="text-muted-foreground [&_svg]:size-8">{icon}</div>
      ) : null}
      <div className="space-y-1">
        <p className="font-medium text-ink">{title}</p>
        {description ? (
          <p className="text-sm text-caption max-w-sm">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
