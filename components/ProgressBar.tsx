import type { CSSProperties } from "react";

export type ProgressBarTone = "default" | "success" | "warning" | "danger";

export type ProgressBarProps = {
  label: string;
  value: number;
  compact?: boolean;
  showValue?: boolean;
  tone?: ProgressBarTone;
  descriptionId?: string;
  className?: string;
};

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ProgressBar({
  label,
  value,
  compact = false,
  showValue = false,
  tone = "default",
  descriptionId,
  className,
}: ProgressBarProps) {
  const safeValue = clampPercentage(value);
  const classes = [
    "accessible-progress",
    compact ? "accessible-progress--compact" : "",
    `accessible-progress--${tone}`,
    className ?? "",
  ].filter(Boolean).join(" ");
  const fillStyle = { "--progress-value": `${safeValue}%` } as CSSProperties;

  return (
    <div className={classes}>
      {showValue ? (
        <div className="accessible-progress__summary">
          <span>{label}</span>
          <strong>{safeValue}%</strong>
        </div>
      ) : null}
      <div
        aria-describedby={descriptionId}
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeValue} %`}
        className="accessible-progress__track"
        role="progressbar"
      >
        <span aria-hidden="true" className="accessible-progress__fill" style={fillStyle} />
      </div>
    </div>
  );
}

export default ProgressBar;
