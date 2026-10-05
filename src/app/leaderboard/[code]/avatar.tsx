import Image from "next/image";
import styles from "./avatar.module.css";

type Props = {
  steamId: string;
  name: string;
  src: string | null;
  size?: number;
};

/** A Steam avatar, or a coloured tile with the player's initial when there is none. */
export default function Avatar({ steamId, name, src, size = 32 }: Props) {
  if (src) return <Image className={styles.avatar} src={src} alt="" width={size} height={size}/>;

  return (
	<span className={`${styles.avatar} ${styles.initial}`} style={{ width: size, height: size, background: tileColour(steamId) }} aria-hidden="true">
	  {Array.from(name)[0]?.toUpperCase()}
	</span>
  );
}

function tileColour(steamId: string) {
  let hash = 0;
  for (const char of steamId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 32% 42%)`;
}
