import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ButtonLink from "@/components/button-link";
import { getUpdate } from "@/lib/steam/updates";
import { formatUpdateDate } from "../update-card";
import styles from "./page.module.css";

export async function generateMetadata({ params }: PageProps<"/updates/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const update = await getUpdate(id).catch(() => null);
  if (!update) return { title: "Updates · Neodrive" };

  return {
	title: `${update.fullTitle} · Neodrive`,
	description: update.excerpt,
	openGraph: { images: update.banner ?? (update.image.isFallback ? undefined : update.image.url) },
  };
}

export default async function UpdatePage({ params }: PageProps<"/updates/[id]">) {
  await connection(); // render per request from the in-memory Steam cache, not at build time
  const { id } = await params;
  // null: Steam has no such post. undefined: Steam couldn't be reached.
  const update = await getUpdate(id).catch((error) => {
	console.error(`[updates/${id}]`, error);
	return undefined;
  });
  if (update === null) notFound();

  const back = (
	<Link href="/updates" className={styles.back}>
	  <span aria-hidden="true">←</span> All updates
	</Link>
  );

  if (!update) {
	return (
	  <main className={`container ${styles.page}`}>
		<article className={styles.article}>
		  {back}
		  <p className={styles.error}>This update couldn&apos;t be loaded from Steam right now. Please try again in a minute.</p>
		</article>
	  </main>
	);
  }

  return (
	<main className={`container ${styles.page}`}>
	  <article className={styles.article}>
		{back}

		<header className={styles.header}>
		  <div className={styles.meta}>
			<span className={styles.tag}>{update.label}</span>
			<time dateTime={update.date}>{formatUpdateDate(update.date)}</time>
		  </div>
		  <h1 className={styles.title}>{update.title}</h1>
		  <ButtonLink href={update.steamUrl} variant="secondary">View on Steam</ButtonLink>
		</header>

		{update.banner && (
		  <Image
			src={update.banner}
			alt=""
			width={1920}
			height={622}
			loading="eager"
			sizes="(max-width: 1000px) 100vw, 960px"
			className={styles.banner}
		  />
		)}

		{/* Sanitized server-side by toHtml in src/lib/steam/bbcode.ts */}
		<div className={styles.post} dangerouslySetInnerHTML={{ __html: update.html }}/>
	  </article>
	</main>
  );
}
