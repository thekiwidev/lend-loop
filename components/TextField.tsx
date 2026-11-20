"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { FieldShell } from "./Field";
import { Icon } from "./Icon";

interface Shared {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  icon?: string;
  optional?: boolean;
  className?: string;
}

export type TextFieldProps =
  | (Shared & { multiline?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "className">)
  | (Shared & { multiline: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">);

export function TextField(props: TextFieldProps) {
  const auto = useId();
  const { label, hint, error, icon, optional, className, id: givenId, multiline, ...rest } = props;
  const id = givenId ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(describedBy) => (
        <div className={cx("ll-field__control", icon && "has-icon")}>
          {icon ? <Icon name={icon} size={18} className="ll-field__icon" /> : null}
          {multiline ? (
            <textarea
              {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
              id={id}
              className="ll-input"
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
            />
          ) : (
            <input
              {...(rest as InputHTMLAttributes<HTMLInputElement>)}
              id={id}
              className="ll-input"
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
            />
          )}
        </div>
      )}
    </FieldShell>
  );
}
