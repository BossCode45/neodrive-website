import type { Metadata } from "next";
import ButtonLink from "@/components/button-link";
import Eyebrow from "@/components/eyebrow";
import styles from "./status-page.module.css";

export const metadata: Metadata = {
  title: "Page not found · Neodrive",
};

export default function NotFound() {
  return (
	<main className={`container ${styles.page}`}>
	  <Eyebrow>Error 404</Eyebrow>
	  <h1 className={styles.title}>Page not found</h1>
	  <p className={styles.intro}>This page doesn&apos;t exist. It may have moved, or the link may be wrong.</p>
	  <div className={styles.actions}>
		<ButtonLink href="/">Back to home</ButtonLink>
		<ButtonLink href="/leaderboard" variant="secondary">View leaderboard</ButtonLink>
	  </div>
	</main>
  );
}
