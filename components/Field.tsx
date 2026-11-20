import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export interface FieldShellProps {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
  /** Receives the id of the hint or error so the control can point aria-describedby at it. */
  children: (describedBy: string | undefined) => ReactNode;
}

/** Label, control and message layout shared by TextField and Select. */
export function FieldShell({ id, label, hint, error, optional, className, children }: FieldShellProps) {
  const msgId = `${id}-msg`;
  return (
    <div className={cx("ll-field", error ? "has-error" : null, className)}>
      {label ? (
        <label className="ll-field__label" htmlFor={id}>
          {label}
          {optional ? <span className="ll-field__opt"> (optional)</span> : null}
        </label>
      ) : null}
      {children(error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} className="ll-field__error">
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="ll-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
