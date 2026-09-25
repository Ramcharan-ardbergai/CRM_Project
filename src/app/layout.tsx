import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Focus CRM",
  description: "Manage contacts, deals, pipeline, tasks and support in one place.",
};

// Apply the saved theme before first paint to avoid a flash.
const themeScript = `try{var s=JSON.parse(localStorage.getItem("focus-crm-v2")||"{}");if(s.state&&s.state.settings&&s.state.settings.theme==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
