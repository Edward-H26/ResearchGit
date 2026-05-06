import type { ReactNode } from "react";

export type IconName = "plus" | "note" | "pointer" | "hand";

const paths: Record<IconName, ReactNode> = {
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  note: (
    <>
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M16 3v4h4" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </>
  ),
  pointer: <path d="M5 3l14 9-7 1-3 7z" />,
  hand: (
    <>
      <path d="M8 12V5a2 2 0 1 1 4 0v6" />
      <path d="M12 11V4a2 2 0 1 1 4 0v8" />
      <path d="M16 12V7a2 2 0 1 1 4 0v7a7 7 0 0 1-14 0v-2a2 2 0 1 1 4 0v2" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
