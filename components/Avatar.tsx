import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

const TONES = ["pine", "brass", "sky", "clay"] as const;

function hash(s: string): number {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
  return x;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = (parts[0] || "?").charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = "md", trusted, className }: { name: string; size?: "sm" | "md" | "lg"; trusted?: boolean; className?: string }) {
  const tone = TONES[hash(name) % TONES.length];
  return (
    <span className={cx("ll-avatar", `ll-avatar--${size}`, `ll-avatar--${tone}`, className)} title={name}>
      <span aria-hidden="true">{initials(name)}</span>
      <span className="ll-sr">{name + (trusted ? ", trusted lender" : "")}</span>
      {trusted ? (
        <span className="ll-avatar__trust" aria-hidden="true">
          <Icon name="check" size={9} strokeWidth={3.5} />
        </span>
      ) : null}
    </span>
  );
}
