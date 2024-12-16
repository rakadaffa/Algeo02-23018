import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Montserrat } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";

const montserrat = Montserrat({
  subsets: ["latin"], // Add subsets based on your needs
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"], // Include all weights
  variable: "--font-montserrat", // Define a custom variable for Tailwind or CSS
  display: "swap", // Optional: Improves loading experience
});

export const metadata: Metadata = {
  title: "Spoti-find Lembang",
  description: "Find your favorite music the way you like it!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
