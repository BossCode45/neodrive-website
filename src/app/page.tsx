import Image from "next/image";
import { Suspense } from "react";
import ButtonLink from "@/components/button-link";
import Eyebrow from "@/components/eyebrow";
import { steamStoreUrl } from "@/components/site-links";
import LatestUpdateButton from "./latest-update-button";
import styles from "./page.module.css";

// TODO: Placeholder copy. Replace with the text from the Figma home frame (17:2).
const features = [
  { title: "Easy to pickup, hard to master", body: "Simple controls get you on the tracks immediately, but a manual gearbox leaves a high skill ceiling." },
  { title: "Instant respawns", body: "Time attack racing with no waiting around. Respawn or restart instantly after a crash." },
  { title: "Beat your friends", body: "Chase your own personal best, then take on the global leaderboards to get the fastest lap times." },
];

export default function Home() {
  return (
	<main>
	  <section className={styles.hero}>
		<Image
		  src="/images/hero.png"
		  alt="A picture of a car racing on a track"
		  fill
		  priority
		  sizes="100vw"
		  className={styles.heroImage}
		/>
		<div className={styles.heroScrim}/>
		<div className={`container ${styles.heroContent}`}>
		  <Suspense fallback={null}>
			<LatestUpdateButton/>
		  </Suspense>
		  <Eyebrow>Time attack racing</Eyebrow>
		  <h1 className={styles.heroTitle}>A high speed<br/>racing game</h1>
		  <p className={styles.intro}>
			Master the manual transmission and high speed drifting. Respawn instantly, chase your best lap, and race your friends to the top of the leaderboard.
		  </p>
		  <div className={styles.actions}>
			<ButtonLink href={steamStoreUrl}>Play now</ButtonLink>
			<ButtonLink href="/leaderboard" variant="secondary">View leaderboard</ButtonLink>
		  </div>
		</div>
	  </section>

	  <section className="section">
		<div className="container">
		  <div className={styles.heading}>
			<Eyebrow>Features</Eyebrow>
			<h2 className={styles.sectionTitle}>Built for the perfect lap</h2>
		  </div>
		  <div className={styles.features}>
			{features.map(({ title, body }, i) => (
			  <article key={title} className={styles.card}>
				<span className={styles.cardNumber}>{String(i + 1).padStart(2, "0")}</span>
				<h3 className={styles.cardTitle}>{title}</h3>
				<p className={styles.cardBody}>{body}</p>
			  </article>
			))}
		  </div>
		</div>
	  </section>

	  <section className="section">
		<div className={`container ${styles.showcase}`}>
		  <Image
			src="/images/showcase.png"
			alt="A picture of the two cards in NEODRIVE"
			width={1920}
			height={1080}
			sizes="(max-width: 900px) 100vw, 50vw"
			className={styles.showcaseImage}
		  />
		  <div className={styles.showcaseCopy}>
			<Eyebrow>Leaderboards</Eyebrow>
			<h2 className={styles.showcaseTitle}>Showcase title placeholder</h2>
			<p className={styles.body}>
			  Placeholder showcase text. Replace with the leaderboard copy from Figma.
			</p>
			<div className={styles.actions}>
			  <ButtonLink href="/leaderboard">View leaderboard</ButtonLink>
			</div>
		  </div>
		</div>
	  </section>

	  <section className={styles.cta}>
		<div className={`container ${styles.ctaInner}`}>
		  <div>
			<h2 className={styles.ctaTitle}>Ready to race?</h2>
			<p className={styles.ctaText}>Placeholder call-to-action line.</p>
		  </div>
		  <ButtonLink href={steamStoreUrl} variant="dark">Play now</ButtonLink>
		</div>
	  </section>
	</main>
  );
}
