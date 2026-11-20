import { GLYPHS } from "@/lib/icons";
import { cx } from "@/lib/cx";

export interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  /** Set for a meaningful icon; leave out when a word sits next to it. */
  label?: string;
  className?: string;
}

export function Icon({ name, size = 20, strokeWidth = 1.75, label, className }: IconProps) {
  const paths = GLYPHS[name] ?? GLYPHS.box;
  return (
    <svg
      className={cx("ll-icon", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
