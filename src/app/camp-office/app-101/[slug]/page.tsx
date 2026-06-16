import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { GolfCampIcon } from "@/components/GolfCampIcons";
import { appGuides, getAppGuide } from "../guides";

type GuidePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return appGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getAppGuide(slug);

  return {
    title: guide ? `${guide.title} | Golf Camp App 101` : "Golf Camp App 101",
  };
}

export default async function AppGuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getAppGuide(slug);

  if (!guide) {
    notFound();
  }

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": guide.accent } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/camp-office/app-101" className="gc-back-link">
            ← BACK
          </Link>
          <p className="gc-topbar-title">App 101</p>
          <span className="gc-top-icon">
            <GolfCampIcon name={guide.icon} className="h-4 w-4" />
          </span>
        </div>

        <section
          className="overflow-hidden rounded-xl border bg-[#0d0d0b] shadow-[0_18px_55px_rgba(0,0,0,0.32)]"
          style={
            {
              borderColor: `${guide.accent}48`,
              boxShadow: `0 18px 55px rgba(0,0,0,0.32), 0 0 34px ${guide.accent}16`,
            } as CSSProperties
          }
        >
          <div
            className="border-b px-5 py-5"
            style={{
              borderColor: `${guide.accent}26`,
              background: `linear-gradient(180deg, ${guide.accent}1f, #151411 78%)`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="font-mono text-[10px] font-black uppercase tracking-[0.22em]"
                  style={{ color: guide.accent }}
                >
                  {guide.kicker}
                </p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-[#f4f1ea]">
                  {guide.title}
                </h1>
              </div>

              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  borderColor: `${guide.accent}55`,
                  color: guide.accent,
                  backgroundColor: `${guide.accent}12`,
                }}
              >
                <GolfCampIcon name={guide.icon} className="h-6 w-6" />
              </span>
            </div>

            <p className="mt-4 text-sm font-semibold leading-6 text-[#d6d0c4]">
              {guide.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-[#242420]">
            {guide.highlights.map((highlight) => (
              <div key={highlight} className="grid grid-cols-[0.85rem_1fr] gap-3 px-5 py-3">
                <span
                  className="mt-2 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: guide.accent }}
                />
                <p className="text-sm font-black leading-5 text-[#f4f1ea]">
                  {highlight}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          {guide.sections.map((section, index) => (
            <article
              key={section.title}
              className="overflow-hidden rounded-xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_18px_55px_rgba(0,0,0,0.26)]"
            >
              <div
                className="grid grid-cols-[3rem_1fr] border-b"
                style={{ borderColor: `${guide.accent}24` }}
              >
                <div
                  className="flex items-center justify-center border-r bg-[#151411] font-mono text-xs font-black"
                  style={{ borderColor: `${guide.accent}24`, color: guide.accent }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="px-4 py-4">
                  <h2 className="text-2xl font-black tracking-tight text-[#f4f1ea]">
                    {section.title}
                  </h2>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <p className="text-sm font-semibold leading-6 text-[#d6d0c4]">
                  {section.body}
                </p>

                <ul className="space-y-2">
                  {section.points.map((point) => (
                    <li
                      key={point}
                      className="grid grid-cols-[0.75rem_1fr] gap-3 text-sm leading-6 text-[#a8a29a]"
                    >
                      <span
                        className="mt-2 h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: guide.accent }}
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </section>

        <Link
          href="/camp-office/feedback"
          className="block rounded-xl border border-[#b98590]/45 bg-[#0d0d0b] px-5 py-4 text-center shadow-[0_18px_55px_rgba(0,0,0,0.26)]"
        >
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#b98590]">
            Still Confused?
          </p>
          <p className="mt-1 text-sm font-black text-[#f4f1ea]">
            Submit App Feedback
          </p>
        </Link>
      </div>
    </main>
  );
}
