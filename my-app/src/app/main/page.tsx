import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  AlertTriangleIcon,
  BellIcon,
  BotIcon,
  CameraIcon,
  FlameIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  PersonStandingIcon,
  Settings2Icon,
  SirenIcon,
  UserPlusIcon,
  VideoIcon,
} from "@/components/ui/icons";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40 xl:py-56 bg-background">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-foreground drop-shadow-md dark:from-white dark:to-gray-400 dark:drop-shadow-lg">
                    IndustriWatch: AI-Powered Surveillance
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Connect your RTSP cameras and detect anomalies using
                    advanced AI analytics for violence, poses, fire, and more.
                    Get real-time alerts and maintain a secure environment.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/signup" prefetch={false}>
                      Get Started
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="https://github.com/AtharshKrishnamoorthy/NAVIGATE-LABS-CP" prefetch={false}>
                      Learn More
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="mx-auto flex w-full items-center justify-center">
                <div className="aspect-video w-full max-w-md overflow-hidden rounded-2xl bg-white border-4 border-gray-200 dark:border-gray-700 shadow-2xl flex items-center justify-center p-4">
                  <Image
                    src="/image2.png"
                    alt="IndustriWatch Integrations"
                    width={400}
                    height={225}
                    className="object-contain w-full h-full rounded-xl"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32 bg-card"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Advanced Detection Capabilities
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our system leverages state-of-the-art AI models to provide
                  comprehensive surveillance and real-time threat detection.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-6xl gap-6 py-12 lg:grid-cols-3 lg:gap-8">
              <div className="group grid gap-4 rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 text-center items-center justify-center">
                <div className="bg-muted rounded-full p-4 flex items-center justify-center self-center w-fit mx-auto">
                  <VideoIcon className="h-10 w-10 text-info" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">RTSP Stream Support</h3>
                  <p className="text-muted-foreground">
                    Connect any standard RTSP camera feed for continuous
                    monitoring.
                  </p>
                </div>
              </div>
              <div className="group grid gap-4 rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 text-center items-center justify-center">
                <div className="bg-muted rounded-full p-4 flex items-center justify-center self-center w-fit mx-auto">
                  <SirenIcon className="h-10 w-10 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Violence Detection</h3>
                  <p className="text-muted-foreground">
                    Automatically identify and flag violent activities.
                  </p>
                </div>
              </div>
              <div className="group grid gap-4 rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 text-center items-center justify-center">
                <div className="bg-muted rounded-full p-4 flex items-center justify-center self-center w-fit mx-auto">
                  <PersonStandingIcon className="h-10 w-10 text-warning" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Pose Analysis</h3>
                  <p className="text-muted-foreground">
                    Detect unusual human poses that may indicate emergencies.
                  </p>
                </div>
              </div>
              <div className="group grid gap-4 rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 text-center items-center justify-center">
                <div className="bg-muted rounded-full p-4 flex items-center justify-center self-center w-fit mx-auto">
                  <FlameIcon className="h-10 w-10 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Fire & Smoke Detection</h3>
                  <p className="text-muted-foreground">
                    An early warning system for fire and smoke.
                  </p>
                </div>
              </div>
              <div className="group grid gap-4 rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 text-center items-center justify-center">
                <div className="bg-muted rounded-full p-4 flex items-center justify-center self-center w-fit mx-auto">
                  <BellIcon className="h-10 w-10 text-success" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Real-time Alerts</h3>
                  <p className="text-muted-foreground">
                    Receive instant notifications via Telegram on threat
                    detection.
                  </p>
                </div>
              </div>
              <div className="group grid gap-4 rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 text-center items-center justify-center">
                <div className="bg-muted rounded-full p-4 flex items-center justify-center self-center w-fit mx-auto">
                  <LayoutDashboardIcon className="h-10 w-10 text-info" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Analytics Dashboard</h3>
                  <p className="text-muted-foreground">
                    A comprehensive dashboard for reviewing events and trends.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  How It Works
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Get started with IndustriWatch in just a few simple steps.
                </p>
              </div>
            </div>
            <div className="relative mt-12 grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-card flex items-center justify-center border-2 border-primary">
                  <UserPlusIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold">1. Sign Up</h3>
                <p className="text-sm text-muted-foreground">
                  Create an account to get started.
                </p>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-card flex items-center justify-center border-2 border-primary">
                  <CameraIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold">2. Connect Camera</h3>
                <p className="text-sm text-muted-foreground">
                  Add your RTSP camera stream URL.
                </p>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-card flex items-center justify-center border-2 border-primary">
                  <Settings2Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold">3. Configure AI</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the detection models to run.
                </p>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-card flex items-center justify-center border-2 border-primary">
                  <AlertTriangleIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold">4. Get Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Receive real-time notifications.
                </p>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-card flex items-center justify-center border-2 border-primary">
                  <LayoutGridIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold">5. Review Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze events and monitor trends.
                </p>
              </div>
            </div>
          </div>
        </section>

        

        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Ready to Enhance Your Security?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Sign up today and start leveraging the power of AI to protect
                your assets and ensure safety.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <div className="flex space-x-2">
                <Button asChild size="lg" className="flex-1">
                  <Link href="/login" prefetch={false}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1">
                  <Link href="#" prefetch={false}>
                    Contact Sales
                  </Link>
      </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
