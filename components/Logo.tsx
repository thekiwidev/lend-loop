import { cx } from "@/lib/cx";

const SIZES = { sm: [24, "ll-logo--sm"], md: [32, "ll-logo--md"], lg: [44, "ll-logo--lg"] } as const;

export function Logo({ size = "md", markOnly, className }: { size?: "sm" | "md" | "lg"; markOnly?: boolean; className?: string }) {
  const [px, sizeClass] = SIZES[size];
  return (
    <span className={cx("ll-logo", sizeClass, className)} role="img" aria-label="LendLoop">
      <svg className="ll-logo__mark" width={px} height={px} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect x={1} y={1} width={30} height={30} rx={9} className="ll-logo__tile" />
        <path d="M10.5 8.5v11a3.5 3.5 0 0 0 3.5 3.5h7.5" className="ll-logo__l" />
        <circle cx={21} cy={11.5} r={3.6} className="ll-logo__loop" />
      </svg>
      {markOnly ? null : (
        <span className="ll-logo__word" aria-hidden="true">
          Lend<b>Loop</b>
        </span>
      )}
    </span>
  );
}
