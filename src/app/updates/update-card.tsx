import Image from "next/image";
import Link from "next/link";
import type { UpdateSummary } from "@/lib/steam/updates";
import styles from "./update-card.module.css";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatUpdateDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

type Props = {
  update: UpdateSummary;
  /** Load the image immediately; for cards above the fold. */
  eager?: boolean;
};

export default function UpdateCard({ update, eager = false }: Props) {
  return (
	<article className={styles.card}>
	  <div className={update.image.isFallback ? `${styles.image} ${styles.fallback}` : styles.image}>
		<Image
		  src={update.image.url}
		  alt=""
		  fill
		  loading={eager ? "eager" : "lazy"}
		  sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
		/>
	  </div>
	  <div className={styles.content}>
		<div className={styles.meta}>
		  <span className={styles.tag}>{update.label}</span>
		  <time dateTime={update.date}>{formatUpdateDate(update.date)}</time>
		</div>
		<h2 className={styles.title} title={update.title}>{update.title}</h2>
		<p className={styles.excerpt}>{update.excerpt}</p>
		<Link href={`/updates/${update.id}`} className={styles.link}>
		  Read update <span className={styles.arrow} aria-hidden="true">→</span>
		</Link>
	  </div>
	</article>
  );
}
