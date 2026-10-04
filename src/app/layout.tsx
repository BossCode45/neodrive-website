import type { Metadata } from "next";
import {
  Bebas_Neue,
  Exo_2,
  IBM_Plex_Sans_Condensed,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin"],
  weight: "800",
  style: "italic",
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const plexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
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
