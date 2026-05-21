import type { SVGProps } from "react";

export type GolfCampIconName =
  | "admin"
  | "bank"
  | "camp"
  | "draft"
  | "ledger"
  | "log"
  | "money"
  | "night"
  | "p2p"
  | "rooms"
  | "roster"
  | "rules"
  | "settlement"
  | "shenanigans"
  | "sideGames"
  | "wagers";

type GolfCampIconProps = SVGProps<SVGSVGElement> & {
  name: GolfCampIconName;
};

function baseProps(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function GolfCampIcon({ name, ...props }: GolfCampIconProps) {
  switch (name) {
    case "admin":
      return (
        <svg {...baseProps(props)}>
          <path d="M16 4 25 8v7c0 6-3.8 10.2-9 13-5.2-2.8-9-7-9-13V8l9-4Z" />
          <path d="M12 16h8" />
          <path d="M16 12v8" />
        </svg>
      );
    case "bank":
      return (
        <svg {...baseProps(props)}>
          <path d="M6 11h20" />
          <path d="M8 11 16 6l8 5" />
          <path d="M9 14v8" />
          <path d="M15 14v8" />
          <path d="M21 14v8" />
          <path d="M6 25h20" />
        </svg>
      );
    case "camp":
      return (
        <svg {...baseProps(props)}>
          <path d="M7 25V11l9-5 9 5v14" />
          <path d="M12 25v-7h8v7" />
          <path d="M11 13h2" />
          <path d="M19 13h2" />
        </svg>
      );
    case "draft":
      return (
        <svg {...baseProps(props)}>
          <path d="M7 7h18v18H7z" />
          <path d="M11 12h10" />
          <path d="M11 17h7" />
          <path d="M11 22h4" />
          <path d="M23 4v6" />
        </svg>
      );
    case "ledger":
      return (
        <svg {...baseProps(props)}>
          <path d="M8 6h16v20H8z" />
          <path d="M12 11h8" />
          <path d="M12 16h8" />
          <path d="M12 21h5" />
        </svg>
      );
    case "log":
      return (
        <svg {...baseProps(props)}>
          <path d="M8 7h12l4 4v14H8z" />
          <path d="M19 7v5h5" />
          <path d="M12 18h8" />
          <path d="M16 14v8" />
        </svg>
      );
    case "money":
      return (
        <svg {...baseProps(props)}>
          <path d="M6 10h20v14H6z" />
          <path d="M10 14h.01" />
          <path d="M22 20h.01" />
          <path d="M16 13v8" />
          <path d="M19 15.5c-.7-1-1.7-1.5-3-1.5-1.5 0-2.5.7-2.5 1.8 0 2.8 5 1.1 5 4 0 1.2-1 2.2-2.9 2.2-1.3 0-2.5-.5-3.3-1.4" />
        </svg>
      );
    case "night":
      return (
        <svg {...baseProps(props)}>
          <path d="M21 5a9.5 9.5 0 1 0 6 14.9A8 8 0 0 1 21 5Z" />
          <path d="M10 25V12" />
          <path d="M10 12h8l-2.5 3L18 18h-8" />
        </svg>
      );
    case "p2p":
      return (
        <svg {...baseProps(props)}>
          <path d="M10 17 7 14a3 3 0 0 1 4.2-4.2l2 2" />
          <path d="M22 17 25 14a3 3 0 0 0-4.2-4.2l-2 2" />
          <path d="M11 18l4 4a2.8 2.8 0 0 0 4 0l2-2" />
          <path d="M13 12h6l2 2-5 5-5-5 2-2Z" />
        </svg>
      );
    case "rooms":
      return (
        <svg {...baseProps(props)}>
          <path d="M6 24V9h20v15" />
          <path d="M10 24v-6h12v6" />
          <path d="M10 13h4" />
          <path d="M18 13h4" />
        </svg>
      );
    case "roster":
      return (
        <svg {...baseProps(props)}>
          <path d="M8 7h16v18H8z" />
          <path d="M13 13a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
          <path d="M11.5 22c.9-2.2 2.4-3.3 4.5-3.3s3.6 1.1 4.5 3.3" />
        </svg>
      );
    case "rules":
      return (
        <svg {...baseProps(props)}>
          <path d="M9 6h14v20H9z" />
          <path d="M13 12h6" />
          <path d="M13 17h6" />
          <path d="M13 22h3" />
        </svg>
      );
    case "settlement":
      return (
        <svg {...baseProps(props)}>
          <path d="M7 10h18v14H7z" />
          <path d="M11 15h10" />
          <path d="M11 19h6" />
          <path d="M21 6v8" />
          <path d="M18 9l3-3 3 3" />
        </svg>
      );
    case "shenanigans":
      return (
        <svg {...baseProps(props)}>
          <path d="M8 22c4-8 7-12 13-16" />
          <path d="M9 9c3 1 5 3 6 6" />
          <path d="M17 17c2 1 4 3 5 6" />
          <path d="M8 22h16" />
        </svg>
      );
    case "sideGames":
      return (
        <svg {...baseProps(props)}>
          <path d="M8 23c5-1 8-4 10-9" />
          <path d="M18 14h6v8h-7" />
          <path d="M8 23a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          <path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        </svg>
      );
    case "wagers":
      return (
        <svg {...baseProps(props)}>
          <path d="M9 9h14v14H9z" />
          <path d="M13 13h6" />
          <path d="M13 18h6" />
          <path d="M7 7h14" />
        </svg>
      );
  }
}
