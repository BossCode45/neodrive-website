"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ButtonLink from "./button-link";
import { isActive, siteLinks, steamStoreUrl } from "./site-links";
import styles from "./navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();

  return (
	<nav className={styles.nav}>
	  <div className={styles.inner}>
		<Link href="/" className={styles.logo} aria-label="Neodrive home"/>
		<div className={styles.links}>
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
		  <ButtonLink href={steamStoreUrl} variant="dark">Play now</ButtonLink>
		</div>
	  </div>
	</nav>
  )
}
