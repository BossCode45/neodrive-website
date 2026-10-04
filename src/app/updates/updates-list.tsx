"use client";

import { useState } from "react";
import type { UpdateSummary } from "@/lib/steam/updates";
import buttonStyles from "@/components/button-link.module.css";
import UpdateCard from "./update-card";
import styles from "./page.module.css";

const PAGE_SIZE = 6;

type Props = {
  initial: UpdateSummary[];
  total: number;
};

export default function UpdatesList({ initial, total: initialTotal }: Props) {
  const [updates, setUpdates] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function loadMore() {
	setLoading(true);
	setError(false);
	try {
	  const res = await fetch(`/api/updates?offset=${updates.length}&limit=${PAGE_SIZE}`);
	  if (!res.ok) throw new Error(`${res.status}`);
	  const data: { updates: UpdateSummary[]; total: number } = await res.json();
	  setUpdates((current) => {
		const seen = new Set(current.map((u) => u.id));
		return [...current, ...data.updates.filter((u) => !seen.has(u.id))];
	  });
	  setTotal(data.total);
	} catch {
	  setError(true);
	} finally {
	  setLoading(false);
	}
  }

  return (
	<div className={styles.list}>
	  <div className={styles.grid}>
		{updates.map((update, i) => <UpdateCard key={update.id} update={update} eager={i < initial.length}/>)}
	  </div>
	  {error && <p className={styles.error} role="alert">Couldn&apos;t load older updates. Please try again.</p>}
	  {updates.length < total && (
		<button
		  type="button"
		  className={`${buttonStyles.button} ${buttonStyles.secondary}`}
		  onClick={loadMore}
		  disabled={loading}
		>
		  {loading ? "Loading…" : "Load older updates"}
		</button>
	  )}
	</div>
  );
}
