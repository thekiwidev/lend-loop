"use client";

import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { FieldShell } from "./Field";
import { Icon } from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  options: readonly SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({ label, hint, error, optional, options, placeholder, className, id: givenId, ...rest }: SelectProps) {
  const auto = useId();
  const id = givenId ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(describedBy) => (
        <div className="ll-field__control">
          <select {...rest} id={id} className="ll-select" aria-invalid={error ? true : undefined} aria-describedby={describedBy}>
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={18} className="ll-field__chev" />
        </div>
      )}
    </FieldShell>
  );
}
