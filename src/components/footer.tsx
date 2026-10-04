"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, siteLinks } from "./site-links";
import styles from "./footer.module.css";

export default function Footer() {
  const pathname = usePathname();

  return (
	<footer className={styles.footer}>
	  <div className={styles.inner}>
		<Link href="/" className={styles.logo} aria-label="Neodrive home"/>
		<div className={styles.right}>
		  <nav className={styles.links}>
			{siteLinks.map(({ href, label }) => (
			  <Link
				key={href}
				href={href}
				className={styles.link}
				aria-current={isActive(pathname, href) ? "page" : undefined}
			  >
				{label}
			  </Link>
			))}
		  </nav>
		  <p className={styles.copyright}>© 2026 Neodrive</p>
		</div>
	  </div>
	</footer>
  )
}
