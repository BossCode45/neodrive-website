"use client";

import { useState } from "react";
import { formatGap, formatTime } from "@/lib/lap-time";
import type { LeaderboardEntry } from "@/lib/steam/leaderboards";
import Avatar from "./avatar";
import styles from "./page.module.css";

const PAGE_SIZE = 100; // the API's maximum; every board fits in one page so far

type Props = {
  code: string;
  initial: LeaderboardEntry[];
  total: number;
};

export default function LeaderboardTable({ code, initial, total: initialTotal }: Props) {
  const [entries, setEntries] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function loadMore() {
	setLoading(true);
	setError(false);
	try {
	  const res = await fetch(`/api/leaderboards/${code}?offset=${entries.length}&limit=${PAGE_SIZE}`);
	  if (!res.ok) throw new Error(`${res.status}`);
	  const data: { entries: LeaderboardEntry[]; total: number } = await res.json();
	  setEntries((current) => {
		const seen = new Set(current.map((e) => e.steamId));
		return [...current, ...data.entries.filter((e) => !seen.has(e.steamId))];
	  });
	  setTotal(data.total);
	} catch {
	  setError(true);
	} finally {
	  setLoading(false);
	}
  }

  if (total === 0) {
	return (
	  <div className={styles.table}>
		<p className={styles.noTimes}>No times set yet. Be the first on the board.</p>
	  </div>
	);
  }

  return (
	<div className={styles.table}>
	  <table>
		<thead>
		  <tr>
			<th scope="col" className={styles.rankCol}>Rank</th>
			<th scope="col">Driver</th>
			<th scope="col" className={styles.gapCol}>Gap</th>
			<th scope="col" className={styles.timeCol}>Time</th>
		  </tr>
		</thead>
		<tbody>
		  {entries.map((entry) => (
			<tr key={entry.steamId} className={entry.rank <= 3 ? styles.podium : undefined}>
			  <td className={styles.rankCol}>{entry.rank}</td>
			  <td>
				<a
				  className={styles.driver}
				  href={`https://steamcommunity.com/profiles/${entry.steamId}`}
				  target="_blank"
				  rel="noopener noreferrer"
				>
				  <Avatar steamId={entry.steamId} name={entry.name} src={entry.avatar}/>
				  <span className={styles.driverName}>{entry.name}</span>
				</a>
			  </td>
			  <td className={styles.gapCol}>{entry.rank === 1 ? "–" : formatGap(entry.gapMs)}</td>
			  <td className={styles.timeCol}>{formatTime(entry.timeMs)}</td>
			</tr>
		  ))}
		</tbody>
	  </table>

	  <div className={styles.tableFooter}>
		<span>Showing {entries.length} of {total} {total === 1 ? "driver" : "drivers"}</span>
		{error && <span className={styles.error} role="alert">Couldn&apos;t load more. Please try again.</span>}
		{entries.length < total && (
		  <button type="button" className={styles.showAll} onClick={loadMore} disabled={loading}>
			{loading ? "Loading…" : <>{total - entries.length > PAGE_SIZE ? "Show more" : "Show all"} <span aria-hidden="true">→</span></>}
		  </button>
		)}
	  </div>
	</div>
  );
}
