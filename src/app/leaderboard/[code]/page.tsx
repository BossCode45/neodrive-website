import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Eyebrow from "@/components/eyebrow";
import { formatGap, formatTime } from "@/lib/lap-time";
import { getLeaderboard, type Leaderboard } from "@/lib/steam/leaderboards";
import { getTrack } from "@/lib/tracks";
import Avatar from "./avatar";
import LeaderboardTable from "./leaderboard-table";
import styles from "./page.module.css";

const INITIAL_ROWS = 12;

export async function generateMetadata({ params }: PageProps<"/leaderboard/[code]">): Promise<Metadata> {
  const track = getTrack((await params).code);
  if (!track) return { title: "Leaderboards · Neodrive" };
  return {
	title: `${track.code} ${track.name} · Leaderboard · Neodrive`,
	description: `The fastest laps on ${track.name} in NEODRIVE, straight from Steam.`,
  };
}

export default async function TrackLeaderboard({ params }: PageProps<"/leaderboard/[code]">) {
  const track = getTrack((await params).code);
  if (!track) notFound();

  await connection(); // render per request from the in-memory Steam cache, not at build time
  const leaderboard = await getLeaderboard(track.code).catch((error) => {
	console.error(`[leaderboard/${track.code}]`, error);
	return null;
  });

  return (
	<main>
	  <header className={`container ${styles.header}`}>
		<Link href={`/leaderboard?stage=${track.stage}`} className={styles.back}>
		  <span aria-hidden="true">←</span> All tracks
		</Link>
		<Eyebrow>Leaderboard · Stage {track.stage}</Eyebrow>
		<h1 className={styles.title}>
		  <span className={styles.code}>{track.code}</span> {track.name}
		</h1>
		<p className={styles.intro}>The fastest laps on {track.name}, ranked on Steam.</p>
	  </header>

	  <section className={`container ${styles.body}`}>
		{leaderboard ? (
		  <>
			<TrackStats leaderboard={leaderboard}/>
			<LeaderboardTable code={track.code} initial={leaderboard.entries.slice(0, INITIAL_ROWS)} total={leaderboard.total}/>
		  </>
		) : (
		  <p className={styles.error}>The leaderboard couldn&apos;t be loaded from Steam right now. Please try again in a minute.</p>
		)}
	  </section>
	</main>
  );
}

function TrackStats({ leaderboard: { entries, total } }: { leaderboard: Leaderboard }) {
  const [first, second] = entries;

  return (
	<aside className={styles.stats}>
	  <div className={styles.statsHero}>
		<p className={styles.statsLabel}>Drivers ranked</p>
		<p className={styles.statsCount}>{total}</p>
		<p className={styles.statsSub}>on the Steam leaderboard</p>
	  </div>
	  <dl className={styles.statsList}>
		{first ? (
		  <>
			<div>
			  <dt>Record holder</dt>
			  <dd className={styles.statsDriver}>
				<Avatar steamId={first.steamId} name={first.name} src={first.avatar}/>
				<span className={styles.driverName}>{first.name}</span>
			  </dd>
			</div>
			<div>
			  <dt>Record lap</dt>
			  <dd className={styles.statsRecord}>{formatTime(first.timeMs)}</dd>
			</div>
			{second && (
			  <div>
				<dt>Lead over 2nd</dt>
				<dd className={styles.statsGap}>{formatGap(second.gapMs)}s</dd>
			  </div>
			)}
		  </>
		) : (
		  <div>
			<dt>Record lap</dt>
			<dd>No times set yet</dd>
		  </div>
		)}
	  </dl>
	</aside>
  );
}
