import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import CustomCursor from "@/components/ui/custom-cursor";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <CustomCursor />
        <Toaster />
        {children}
      </body>
    </html>
  );
} 