import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { GolfCampIcon, GolfCampIconName } from "@/components/GolfCampIcons";

export type HomeModule = {
  icon: GolfCampIconName;
  name: string;
  href: string;
  meta: string;
  accent: string;
  tint: string;
  comingSoon?: boolean;
};

type FeedItem = {
  id: string;
  source: string | null;
  message: string;
  created_at: string | null;
};

export function CinematicHomeShell({ children }: { children: ReactNode }) {
  return (
    <main className="cinematic-home-shell min-h-screen overflow-hidden px-4 py-5 text-[#f5f5f5]">
      <div className="cinematic-home-stage mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-3.5 py-3">
        {children}
      </div>
    </main>
  );
}

export function BrandSealHeader() {
  return (
    <header className="home-brand-header relative flex items-center justify-center pb-1 pt-2">
      <div className="home-brand-orbit" />
      <Image
        src="/longview-invitational-logo.png"
        alt="Golf Camp"
        width={104}
        height={104}
        priority
        className="home-brand-seal h-[4.25rem] w-[4.25rem] object-contain"
      />
    </header>
  );
}

export function LiveFeedPanel({
  items,
  isLoading,
  getAccent,
  formatTime,
}: {
  items: FeedItem[];
  isLoading: boolean;
  getAccent: (source: string | null) => string;
  formatTime: (value: string | null) => string;
}) {
  return (
    <section className="home-feed-panel relative overflow-hidden rounded-[0.5rem] border">
      <div className="home-feed-titlebar relative flex items-center justify-between gap-4 px-4 py-2.5">
        <p className="font-mono text-[17px] font-black uppercase tracking-[0.12em] text-[#f4f1ea]">
          LIVE CAMP FEED
        </p>
        <span className="home-online-pill inline-flex items-center gap-1.5 rounded-[0.35rem] border px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.14em]">
          <span className="home-live-dot h-1.5 w-1.5 animate-[campFeedPulse_3.4s_ease-in-out_infinite] rounded-full" />
          Online
        </span>
      </div>

      <div className="camp-feed-scroll home-feed-scroll relative max-h-[9rem] overflow-y-auto overscroll-contain scroll-smooth">
        {isLoading && (
          <p className="px-4 py-5 text-sm font-semibold text-[#a3a3a3]">
            Loading camp activity...
          </p>
        )}

        {!isLoading && items.length === 0 && (
          <p className="px-4 py-5 text-sm font-semibold text-[#a3a3a3]">
            No camp activity yet.
          </p>
        )}

        {!isLoading &&
          items.map((item) => (
            <div
              key={item.id}
              className="home-feed-item grid grid-cols-[auto_1fr] items-start gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <span
                className="mt-1 h-2 w-2 rounded-full shadow-[0_0_14px_currentColor]"
                style={{ color: getAccent(item.source) }}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="home-feed-badge rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em]"
                    style={{
                      borderColor: `${getAccent(item.source)}66`,
                      color: getAccent(item.source),
                    }}
                  >
                    {item.source || "Camp"}
                  </span>
                  <span className="text-[11px] font-semibold text-[#82786a]">
                    {formatTime(item.created_at)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#f4f1ea]">
                  {item.message}
                </p>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

export function GroupMeBridge() {
  return (
    <a
      href="https://groupme.com/join_group/42409831/UEGIef"
      target="_blank"
      rel="noreferrer"
      className="home-chat-bridge group grid grid-cols-[3.35rem_1fr_auto] items-center gap-3 rounded-[0.5rem] border px-4 py-3.5 transition duration-200"
      style={{ "--module-accent": "#7094c0" } as CSSProperties}
    >
      <span className="home-chat-icon flex h-11 w-11 items-center justify-center rounded-[0.45rem] border text-[#7094c0]">
        <svg
          aria-hidden="true"
          className="h-[1.35rem] w-[1.35rem]"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
          viewBox="0 0 24 24"
        >
          <path d="M6.5 17.5 4 20v-4.5A7.5 7.5 0 0 1 2.5 11C2.5 6.9 6.5 3.5 12 3.5S21.5 6.9 21.5 11 17.5 18.5 12 18.5a12 12 0 0 1-5.5-1Z" />
          <path d="M8 10.25h8" />
          <path d="M8 13.25h5.5" />
        </svg>
      </span>
      <div className="relative z-10 min-w-0">
        <span className="home-module-title block truncate font-mono text-[17px] font-black uppercase tracking-[0.12em]">
          GROUPME CHAT
        </span>
        <span className="home-module-meta mt-0.5 block truncate font-mono text-[11px] font-black uppercase tracking-[0.12em]">
          Open the golf camp group chat
        </span>
      </div>
      <span className="relative z-10 font-mono text-xl font-black text-[#7094c0] transition group-hover:translate-x-0.5">
        ↗
      </span>
    </a>
  );
}

export function ModuleMenu({ modules }: { modules: HomeModule[] }) {
  return (
    <section className="home-module-panel flex flex-col gap-3">
      {modules.map((module) => (
        <Link
          key={module.href}
          href={module.href}
          className="home-module-row group grid grid-cols-[3.35rem_1fr_auto] items-center gap-3 rounded-[0.5rem] border px-4 py-3.5"
          style={
            {
              "--module-accent": module.accent,
              "--module-tint": module.tint,
              "--module-edge": `${module.accent}42`,
            } as CSSProperties
          }
        >
          <span className="home-module-mark flex h-11 w-11 items-center justify-center rounded-[0.45rem] border">
            <GolfCampIcon name={module.icon} className="h-[1.35rem] w-[1.35rem]" />
          </span>

          <span className="relative z-10 min-w-0">
            <span className="home-module-title block truncate font-mono text-[17px] font-black uppercase tracking-[0.12em]">
              {module.name.toUpperCase()}
            </span>
            <span className="home-module-meta mt-0.5 block truncate font-mono text-[11px] font-black uppercase tracking-[0.12em]">
              {module.comingSoon ? "Coming Soon • " : ""}
              {module.meta}
            </span>
          </span>

          <span className="home-module-arrow relative z-10 font-mono text-xl font-black transition group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      ))}
    </section>
  );
}

export function AdminHomeRow() {
  return (
    <Link
      href="/admin"
      className="home-admin-row group grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-[0.5rem] border px-4 py-3.5 transition duration-200"
    >
      <span className="home-admin-mark flex h-10 w-10 items-center justify-center rounded-[0.45rem] border">
        <GolfCampIcon name="admin" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[17px] font-black uppercase tracking-[0.12em] text-[#f5f5f5]">
          Admin
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-black uppercase tracking-[0.12em] text-[#8fa66a]">
          Tools • Data • System
        </span>
      </span>
      <span className="font-mono text-xl font-black text-[#f5f5f5] transition group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

export function SessionStrip({
  displayName,
  onLogout,
}: {
  displayName?: string;
  onLogout: () => void;
}) {
  return (
    <div className="home-session-strip flex items-center justify-between gap-3 rounded-[0.6rem] border px-4 py-3">
      <p className="min-w-0 truncate text-xs font-semibold text-[#c8bfae]">
        {displayName ? (
          <>
            Logged in as{" "}
            <span className="text-[#f4f1ea]">{displayName}</span>
          </>
        ) : (
          "Fallback access active"
        )}
      </p>
      {displayName ? (
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 text-xs font-black text-[#8fa66a]"
        >
          Logout
        </button>
      ) : (
        <Link href="/" className="shrink-0 text-xs font-black text-[#8fa66a]">
          Login
        </Link>
      )}
    </div>
  );
}
