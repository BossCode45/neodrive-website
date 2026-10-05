import Link from "next/link";
import { connection } from "next/server";
import { getRecentUpdate } from "@/lib/steam/updates";
import styles from "./latest-update-button.module.css";

/** Links to the newest update, but only if it was posted in the past week. */
export default async function LatestUpdateButton() {
  await connection(); // depends on the current time and live Steam data
  const update = await getRecentUpdate().catch(() => null); // never break the home page over this
  if (!update) return null;

  return (
	<Link href={`/updates/${update.id}`} className={styles.button}>
	  <span className={styles.tag}>New</span>
	  <span className={styles.text}>{update.label.startsWith("v") ? `${update.label} · ${update.title}` : update.title}</span>
	  <span className={styles.arrow} aria-hidden="true">→</span>
	</Link>
  );
}
