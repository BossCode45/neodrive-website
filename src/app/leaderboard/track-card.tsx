import Image from "next/image";
import Link from "next/link";
import type { Track } from "@/lib/tracks";
import TrackIcon from "./track-icon";
import styles from "./track-card.module.css";

type Props = {
  track: Track;
  /** Load the thumbnail immediately; for cards above the fold. */
  eager?: boolean;
};

export default function TrackCard({ track, eager = false }: Props) {
  return (
	<Link href={`/leaderboard/${track.code}`} className={styles.card}>
	  <div className={styles.image}>
		<Image
		  src={track.thumbnail}
		  alt=""
		  fill
		  loading={eager ? "eager" : "lazy"}
		  sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, (max-width: 1400px) 33vw, 25vw"
		/>
		<TrackIcon loop={track.loop} className={styles.icon}/>
	  </div>
	  <div className={styles.label}>
		<span className={styles.code}>{track.code}</span>
		<span className={styles.name}>{track.name}</span>
	  </div>
	</Link>
  );
}
