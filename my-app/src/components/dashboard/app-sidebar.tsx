"use client";

import * as React from "react";
import {
  Home,
  Monitor,
  Video,
  AlertCircle,
  MessageSquare,
  BookOpen,
  Settings2,
  Plug,
} from "lucide-react";

import { NavMain } from "@/components/dashboard/nav-main";
import { NavUser } from "@/components/dashboard/nav-user";
import { IndustriWatchLogo } from "./industriwatch-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const data = {
  user: {
    name: "Atharsh",
    email: "atharsh@example.com",
    avatar: "/placeholder.svg",
  },
  navMain: [
    {
      title: "Home",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Monitor",
      url: "/dashboard/monitor",
      icon: Monitor,
    },
    {
      title: "Sources",
      url: "/dashboard/sources",
      icon: Video,
    },
    {
      title: "Alerts",
      url: "/dashboard/alerts",
      icon: AlertCircle,
    },
    {
      title: "Integrations",
      url: "/dashboard/integrations",
      icon: Plug,
    },
    // Settings removed
  ],
};

// Custom hook to get current user from Supabase
type SupabaseUser = {
  id: string;
  email: string;
  user_metadata?: { username?: string; avatar_url?: string };
};

function useCurrentUser() {
  const [user, setUser] = useState<null | SupabaseUser>(null);
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user as SupabaseUser);
    });
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(session.user as SupabaseUser);
      else setUser(null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);
  return user;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useCurrentUser();
  // Fallback avatar if none is set
  const avatar = user?.user_metadata?.avatar_url || "/placeholder.svg";
  const name = user?.user_metadata?.username || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <IndustriWatchLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* NavProjects removed */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name, email, avatar }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
} 