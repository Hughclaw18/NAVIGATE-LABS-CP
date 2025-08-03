import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Link from "next/link";
import {
  MountainIcon,
  TwitterIcon,
  GithubIcon,
  LinkedinIcon,
} from "../../components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomCursor from "@/components/ui/custom-cursor";
import Image from "next/image";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IndustriWatch - AI Powered Surveillance",
  description:
    "Real-time surveillance monitoring with advanced AI-powered anomaly detection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <CustomCursor />
        <Toaster />
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm px-4 lg:px-6 h-16 flex items-center">
            <Link
              href="#"
              className="flex items-center justify-center gap-2"
              prefetch={false}
            >
              <Image src = "/INDUSTRIWATCH_LOGO.png" alt="IndustriWatch" width={40} height={40} className="rounded-full" />
              <span className="font-semibold text-lg tracking-wide">
                IndustriWatch
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="bg-card border-t border-border">
            <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 py-12 px-4 md:px-6">
              <div className="flex flex-col gap-4">
                <Link
                  href="#"
                  className="flex items-center gap-2"
                  prefetch={false}
                >
                  <Image src = "/INDUSTRIWATCH_LOGO.png" alt="IndustriWatch" width={40} height={40} className="rounded-full" />
                  <span className="font-semibold text-lg tracking-wide">
                    IndustriWatch
                  </span>
                </Link>
                <p className="text-muted-foreground text-sm max-w-xs">
                  AI-powered surveillance for a safer tomorrow.
                </p>
              </div>
              <div className="grid gap-2 text-sm">
                <h4 className="font-semibold">Product</h4>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground"
                  prefetch={false}
                >
                  Features
                </Link>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                  prefetch={false}
                >
                  Pricing
                </Link>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                  prefetch={false}
                >
                  Docs
                </Link>
              </div>
              <div className="grid gap-2 text-sm">
                <h4 className="font-semibold">Legal</h4>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                  prefetch={false}
                >
                  Terms of Service
                </Link>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                  prefetch={false}
                >
                  Privacy Policy
                </Link>
              </div>
              <div className="grid gap-4 text-sm">
                <h4 className="font-semibold">Stay Connected</h4>
                <form className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="max-w-lg flex-1"
                  />
                  <Button type="submit">Subscribe</Button>
                </form>
                <div className="flex gap-4 mt-2">
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                    prefetch={false}
                  >
                    <TwitterIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                    prefetch={false}
                  >
                    <GithubIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                    prefetch={false}
                  >
                    <LinkedinIcon className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="border-t border-border/50">
              <div className="container mx-auto flex items-center justify-center py-6 px-4 md:px-6 text-sm">
                <p className="text-muted-foreground text-xs">
                  &copy; 2024 IndustriWatch. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}