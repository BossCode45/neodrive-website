import styles from "./eyebrow.module.css";

export default function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
	<p className={styles.eyebrow}>{children}</p>
  )
}
