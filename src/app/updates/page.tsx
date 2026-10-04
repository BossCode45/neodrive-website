import type { Metadata } from "next";
import { connection } from "next/server";
import Eyebrow from "@/components/eyebrow";
import { getUpdates } from "@/lib/steam/updates";
import UpdatesList from "./updates-list";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Updates · Neodrive",
  description: "Patch notes, new tracks and everything that's changed in NEODRIVE.",
};

export default async function Updates() {
  await connection(); // render per request from the in-memory Steam cache, not at build time
  const updates = await getUpdates().catch((error) => {
	console.error("[updates]", error);
	return null;
  });

  return (
	<main>
	  <header className={`container ${styles.header}`}>
		<Eyebrow>Dev log</Eyebrow>
		<h1 className={styles.title}>Updates</h1>
		<p className={styles.intro}>Patch notes, new tracks and everything that&apos;s changed.</p>
	  </header>

	  <section className={`container ${styles.body}`}>
		{updates
		  ? <UpdatesList initial={updates.slice(0, 6)} total={updates.length}/>
		  : <p className={styles.error}>Updates couldn&apos;t be loaded from Steam right now. Please try again in a minute.</p>}
	  </section>
	</main>
  );
}
