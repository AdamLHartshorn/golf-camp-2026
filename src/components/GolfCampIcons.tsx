import type { SVGProps } from "react";

export type GolfCampIconName =
  | "admin"
  | "bank"
  | "calcutta"
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
    strokeWidth: 1.8,
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
          <path d="M16 5 24 8.8v7.4c0 5.2-3.2 8.6-8 11-4.8-2.4-8-5.8-8-11V8.8L16 5Z" />
          <path d="M12 15.5h8" />
          <path d="M16 11.5v8" />
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
    case "calcutta":
      return (
        <svg {...baseProps(props)}>
          <path d="M8 22h16" />
          <path d="M11 22V10l5-4 5 4v12" />
          <path d="M13 13h6" />
          <path d="M13 17h6" />
          <path d="M16 6v16" />
        </svg>
      );
    case "camp":
      return (
        <svg {...baseProps(props)}>
          <path d="M6.5 24.5h19" />
          <path d="M8.5 24.5V12.5L16 7l7.5 5.5v12" />
          <path d="M12.5 24.5v-7h7v7" />
          <path d="M11.5 14h2" />
          <path d="M18.5 14h2" />
          <path d="M16 7V4.5" />
          <path d="M16 4.5h4.5" />
        </svg>
      );
    case "draft":
      return (
        <svg {...baseProps(props)}>
          <path d="M7 8h18v16H7z" />
          <path d="M11 12h4" />
          <path d="M17 12h4" />
          <path d="M11 16h4" />
          <path d="M17 16h4" />
          <path d="M11 20h4" />
          <path d="M17 20h4" />
          <path d="M23 5v6" />
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
          <path d="M16 6v20" />
          <path d="M21.5 10.5c-1.2-1.2-3-2-5.3-2-3.2 0-5.4 1.5-5.4 3.9 0 2.7 2.6 3.3 5.4 3.7 3.1.5 5.5 1.2 5.5 3.9 0 2.3-2.2 3.7-5.5 3.7-2.7 0-4.8-.9-6.1-2.4" />
          <path d="M11 12.5h10" />
          <path d="M11 20h10" />
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
          <path d="M12 8.5h8" />
          <path d="M11 11.5h10" />
          <path d="M12 11.5v12" />
          <path d="M20 11.5v12" />
          <path d="M13.5 25h5" />
          <path d="M13.5 15h5" />
          <path d="M13.5 20h5" />
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
          <path d="M9 7 23 25" />
          <path d="M23 7 9 25" />
          <path d="M7.5 5.5 11 8" />
          <path d="M21 8l3.5-2.5" />
          <path d="M9 25l2-4" />
          <path d="M23 25l-2-4" />
          <path d="M13 16h6" />
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
