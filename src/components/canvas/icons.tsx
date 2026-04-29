import type { ReactNode } from "react";

export type IconName =
  | "plus"
  | "trash"
  | "note"
  | "pointer"
  | "hand"
  | "zoomIn"
  | "zoomOut"
  | "reset"
  | "sparkles";

const paths: Record<IconName, ReactNode> = {
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 15h10l1-15" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
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
  zoomIn: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M21 21l-6-6" />
      <path d="M10 7v6" />
      <path d="M7 10h6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M21 21l-6-6" />
      <path d="M7 10h6" />
    </>
  ),
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
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
