import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconRight?: string;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  loading,
  block,
  children,
  className,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) {
  const iconOnly = !children && !!icon;
  const iconSize = size === "sm" ? 16 : 18;
  return (
    <button
      {...rest}
      type={type}
      className={cx(
        "ll-btn",
        `ll-btn--${variant}`,
        `ll-btn--${size}`,
        iconOnly && "ll-btn--icon",
        block && "ll-btn--block",
        loading && "is-loading",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="ll-spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children ? <span className="ll-btn__label">{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
}
