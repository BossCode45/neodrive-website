import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

// Google Fonts (OFL, see fonts/OFL-*.txt), vendored so builds don't need network access.
const exo2 = localFont({
  variable: "--font-exo2",
  src: "./fonts/exo-2-latin-800-italic.woff2",
  weight: "800",
  style: "italic",
});

const bebasNeue = localFont({
  variable: "--font-bebas",
  src: "./fonts/bebas-neue-latin-400-normal.woff2",
  weight: "400",
});

const plexCondensed = localFont({
  variable: "--font-plex",
  src: [
    { path: "./fonts/ibm-plex-sans-condensed-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-sans-condensed-latin-500-normal.woff2", weight: "500" },
  ],
});

const jetbrainsMono = localFont({
  variable: "--font-mono",
  src: [
    { path: "./fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/jetbrains-mono-latin-700-normal.woff2", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: "Neodrive",
  description: "A high speed time-attack racing game",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${exo2.variable} ${bebasNeue.variable} ${plexCondensed.variable} ${jetbrainsMono.variable}`}
    >
      <body>
		<Navbar/>
		{children}
		<Footer/>
	  </body>
    </html>
  );
}
