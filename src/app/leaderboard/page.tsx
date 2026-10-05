import type { Metadata } from "next";
import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { type Stage, STAGES, tracksForStage } from "@/lib/tracks";
import TrackCard from "./track-card";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Leaderboards · Neodrive",
  description: "The fastest laps on every NEODRIVE track, straight from Steam.",
};

type Tab = Stage | "tutorials";

const TABS: { tab: Tab; label: string }[] = [
  { tab: "tutorials", label: "Tutorials" },
  ...STAGES.map((stage) => ({ tab: stage, label: `Stage ${stage}` })),
];

function parseTab(value: string | string[] | undefined): Tab {
  if (value === "tutorials") return "tutorials";
  const stage = Number(value);
  return STAGES.find((s) => s === stage) ?? 1;
}

export default async function Leaderboards({ searchParams }: PageProps<"/leaderboard">) {
  const active = parseTab((await searchParams).stage);
  const tracks = active === "tutorials" ? [] : tracksForStage(active);

  return (
	<main>
	  <header className={`container ${styles.header}`}>
		<Eyebrow>Global rankings</Eyebrow>
		<h1 className={styles.title}>Leaderboards</h1>
		<p className={styles.intro}>Pick a track to see the fastest laps on Steam.</p>
	  </header>

	  <section className={`container ${styles.body}`}>
		<nav className={styles.tabs} aria-label="Stages">
		  {TABS.map(({ tab, label }) => (
			<Link
			  key={tab}
			  href={`/leaderboard?stage=${tab}`}
			  className={styles.tab}
			  aria-current={tab === active ? "page" : undefined}
			  scroll={false}
			>
			  {label}
			</Link>
		  ))}
		</nav>

		<div className={styles.stage}>
		  <div className={styles.stageHeader}>
			<h2 className={styles.stageTitle}>{TABS.find((t) => t.tab === active)?.label}</h2>
			{tracks.length > 0 && <span className={styles.count}>{tracks.length} tracks</span>}
		  </div>

		  {active === "tutorials" ? (
			<div className={styles.empty}>
			  <p className={styles.emptyTitle}>No leaderboard</p>
			  <p className={styles.emptyText}>Tutorial times aren&apos;t ranked. Pick a stage to see the fastest laps.</p>
			</div>
		  ) : (
			<div className={styles.grid}>
			  {tracks.map((track, i) => <TrackCard key={track.code} track={track} eager={i < 8}/>)}
			</div>
		  )}
		</div>
	  </section>
	</main>
  );
}
