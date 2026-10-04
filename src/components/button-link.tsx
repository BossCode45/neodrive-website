import Link from "next/link";
import styles from "./button-link.module.css";

type Props = {
  href: string;
  variant?: "primary" | "secondary" | "dark";
  children: React.ReactNode;
};

export default function ButtonLink({ href, variant = "primary", children }: Props) {
  const className = `${styles.button} ${styles[variant]}`;
  const content = (
	<>
	  {children}
	  {variant !== "secondary" && <span className={styles.arrow} aria-hidden="true">→</span>}
	</>
  );

  return href.startsWith("/")
	? <Link href={href} className={className}>{content}</Link>
	: <a href={href} className={className}>{content}</a>;
}
