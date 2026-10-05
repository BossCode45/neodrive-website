"use client"; // error boundaries must be client components

import { useEffect } from "react";
import ButtonLink from "@/components/button-link";
import buttonStyles from "@/components/button-link.module.css";
import Eyebrow from "@/components/eyebrow";
import styles from "./status-page.module.css";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function Error({ error, retry }: Props) {
  useEffect(() => {
	console.error(error);
  }, [error]);

  return (
	<main className={`container ${styles.page}`}>
	  <Eyebrow>Error</Eyebrow>
	  <h1 className={styles.title}>Something went wrong</h1>
	  <p className={styles.intro}>This page couldn&apos;t be loaded. Please try again in a minute.</p>
	  <div className={styles.actions}>
		<button type="button" className={`${buttonStyles.button} ${buttonStyles.primary}`} onClick={() => retry()}>
		  Try again
		</button>
		<ButtonLink href="/" variant="secondary">Back to home</ButtonLink>
	  </div>
	</main>
  );
}
