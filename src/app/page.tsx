import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata: Metadata = {
  title: "FocusCRM — Every customer relationship, in perfect focus",
  description: "Manage contacts, opportunities, conversations and customer activity from one intelligent workspace.",
};

export default function HomePage() {
  return <MarketingPage />;
}
