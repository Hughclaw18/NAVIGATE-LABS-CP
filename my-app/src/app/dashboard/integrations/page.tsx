"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { TelegramIcon } from "@/components/icons/telegram";
import { SlackIcon } from "@/components/icons/slack";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

const TELEGRAM_TOKEN_KEY = "telegram_bot_token";
const TELEGRAM_CHAT_ID_KEY = "telegram_chat_id";

export default function IntegrationsPage() {
  // Sheet state
  const [open, setOpen] = useState(false);
  // Telegram form state
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);


  // On mount, check localStorage for Telegram credentials
  useEffect(() => {
    const token = localStorage.getItem(TELEGRAM_TOKEN_KEY);
    const chat = localStorage.getItem(TELEGRAM_CHAT_ID_KEY);
    if (token && chat) {
      setBotToken(token);
      setChatId(chat);
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  }, []);

  // Save Telegram credentials
  const handleSave = async () => {
    if (!botToken || !chatId) {
      toast.error("Please provide both Bot Token and Chat ID");
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem(TELEGRAM_TOKEN_KEY, botToken);
      localStorage.setItem(TELEGRAM_CHAT_ID_KEY, chatId);
      // Get user id from Supabase
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) throw new Error("User not authenticated");
      // Save to Upstash Redis via API route
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, botToken, chatId }),
      });
      if (!res.ok) throw new Error("API error");
      setIsRunning(true);
      setOpen(false);
      toast.success("Telegram integration saved!");
    } catch (err) {
      toast.error("Failed to save to Upstash Redis");
      console.error("[ERROR] Upstash save failed", err, { botToken, chatId });
    } finally {
      setLoading(false);
    }
  };

  // Disconnect Telegram
  const handleDisconnect = () => {
    localStorage.removeItem(TELEGRAM_TOKEN_KEY);
    localStorage.removeItem(TELEGRAM_CHAT_ID_KEY);
    setBotToken("");
    setChatId("");
    setIsRunning(false);
    toast("Telegram integration disconnected");
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Messaging Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect a messaging service to receive alerts. You can only have one active connection at a time.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        {/* WhatsApp Card */}
        <Card className="flex flex-col items-center justify-between opacity-60 w-full h-full">
          <CardHeader className="flex flex-col items-center">
            <WhatsappIcon width={48} height={48} />
            <CardTitle className="mt-2">WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center text-center">
            <CardDescription>
              Connect with IndustriWatch via WhatsApp for updates and quick commands on the go.
            </CardDescription>
          </CardContent>
          <Button variant="outline" disabled className="w-auto mt-4">Coming Soon</Button>
        </Card>
        {/* Telegram Card */}
        <Card className="flex flex-col items-center justify-between border-2 border-primary/80 w-full h-full">
          <CardHeader className="flex flex-col items-center">
            <TelegramIcon width={48} height={48} />
            <CardTitle className="mt-2">Telegram</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center text-center">
            <CardDescription>
              Integrate a Telegram bot to IndustriWatch to get real time updates on surviellance
            </CardDescription>
            {isRunning && (
              <div className="flex items-center gap-2 mt-4">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-xs font-semibold">Running</span>
              </div>
            )}
          </CardContent>
          {isRunning ? (
            <Button variant="destructive" className="w-auto mt-4" onClick={handleDisconnect}>Disconnect</Button>
          ) : (
            <Button className="w-auto mt-4" onClick={() => setOpen(true)}>Connect</Button>
          )}
        </Card>
        {/* Slack Card */}
        <Card className="flex flex-col items-center justify-between opacity-60 w-full h-full">
          <CardHeader className="flex flex-col items-center">
            <SlackIcon width={48} height={48} />
            <CardTitle className="mt-2">Slack</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center text-center">
            <CardDescription>
              Receive notifications and alerts by connecting IndustriWatch to your Slack workspace.
            </CardDescription>
          </CardContent>
          <Button variant="outline" disabled className="w-auto mt-4">Coming Soon</Button>
        </Card>
      </div>
      {/* Telegram Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Connect Telegram</SheetTitle>
            <SheetDescription>
              Enter your Telegram Bot Token and Chat ID to enable integration.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1 ms-3">Bot Token</label>
              <Input className="ms-3"
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                placeholder="Enter your Telegram Bot Token"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 ms-3">Chat ID</label>
              <Input className="ms-3"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="Enter your Telegram Chat ID"
              />
            </div>
          </div>
          <SheetFooter className="mt-6 flex flex-row gap-2 justify-end">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}