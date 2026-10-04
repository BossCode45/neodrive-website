export const siteLinks = [
  { href: "/", label: "Home" },
  { href: "/updates", label: "Updates" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export const steamStoreUrl = "https://store.steampowered.com/app/2804240";

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
