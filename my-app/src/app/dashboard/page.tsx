"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Session analytics data
const sessionAnalytics = [
  { day: 'Mon', sessions: 3 },
  { day: 'Tue', sessions: 5 },
  { day: 'Wed', sessions: 4 },
  { day: 'Thu', sessions: 7 },
  { day: 'Fri', sessions: 6 },
  { day: 'Sat', sessions: 8 },
  { day: 'Sun', sessions: 10 },
];

const recentSessions = [
  { id: 1, name: 'Session 1', time: 'Today, 10:45 AM' },
  { id: 2, name: 'Session 2', time: 'Yesterday, 4:20 PM' },
];

// Chart configuration for shadcn/ui
const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function Page() {
  const [username, setUsername] = useState("User");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUsername = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get username from localStorage first
          const cachedUsername = localStorage.getItem(`username_${user.id}`);
          if (cachedUsername) {
            setUsername(cachedUsername);
          } else {
            // Fallback to user metadata if not in localStorage
            setUsername(user.user_metadata?.username || "User");
          }
        }
      } catch (error) {
        console.error("Error getting username:", error);
        setUsername("User");
      } finally {
        setLoading(false);
      }
    };

    getUsername();
  }, []);

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      {/* Welcome Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">
          {loading ? "Loading..." : `Welcome, ${username}!`}
        </h1>
        <p className="text-muted-foreground mt-2">
          An overview of your recent activity and progress.
        </p>
      </div>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 md:hidden">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold">43</div>
          <div className="text-sm text-muted-foreground">Total Sessions</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold">6.2h</div>
          <div className="text-sm text-muted-foreground">This Week</div>
        </Card>
      </div>
      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Activity Overview Chart */}
        <Card className="col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Activity Overview</CardTitle>
                <CardDescription className="mt-1">
                  Your tasks, chats, and other activities from the last week.
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-xs text-muted-foreground">Sessions</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64 w-full">
              <ChartContainer config={chartConfig}>
                <LineChart
                  accessibilityLayer
                  data={sessionAnalytics}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 10,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    dataKey="sessions"
                    type="monotone"
                    stroke="var(--color-sessions)"
                    strokeWidth={3}
                    dot={{
                      fill: "var(--color-sessions)",
                      strokeWidth: 2,
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
            <div className="mt-12 flex items-center justify-between text-sm text-muted-foreground">
              <span>Peak day: Sunday (10 sessions)</span>
              <span>Average: 6.1 sessions/day</span>
            </div>
          </CardContent>
        </Card>
        {/* Recent Sessions Card */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-start justify-between pb-4 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-xl">Last Completed Session</CardTitle>
              <CardDescription>Your most recent focus session.</CardDescription>
            </div>
            <button className="ml-auto px-3 py-1.5 rounded-md bg-muted text-xs font-medium hover:bg-accent transition-colors duration-200 flex items-center space-x-1">
              <span>View All</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            {recentSessions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="text-muted-foreground text-sm">No completed sessions yet.</div>
                  <button className="text-xs text-primary hover:underline">Start your first session</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="font-semibold text-lg mb-1">{recentSessions[0].name}</div>
                  <div className="text-muted-foreground text-sm flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{recentSessions[0].time}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Completed</span>
                    <span className="text-xs text-muted-foreground">25 min</span>
                  </div>
                </div>
                {recentSessions.slice(1).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/20 transition-colors">
                    <div>
                      <div className="font-medium text-sm">{session.name}</div>
                      <div className="text-xs text-muted-foreground">{session.time}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">20 min</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}