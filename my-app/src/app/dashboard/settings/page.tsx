"use client"

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Cropper, { Area } from "react-easy-crop";
import { toast } from "sonner";

// Utility to get cropped image as base64
async function getCroppedImg(
  imageSrc: string,
  crop: { x: number; y: number },
  zoom: number,
  aspect: number
): Promise<string> {
  // Placeholder: just return the original image for now
  return imageSrc;
}

export default function SettingsPage() {
  // Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // User state
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("/placeholder.svg");
  const [usernameLoading, setUsernameLoading] = useState<boolean>(false);

  // Avatar upload/crop state
  const [showCrop, setShowCrop] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password update state
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [pwLoading, setPwLoading] = useState<boolean>(false);

  // Load user info on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        // Check localStorage first for username, then fallback to user metadata
        const cachedUsername = localStorage.getItem(`username_${data.user.id}`);
        setUsername(cachedUsername || data.user.user_metadata?.username || "");
        setEmail(data.user.email || "");
        // Try localStorage first for avatar
        const cached = localStorage.getItem(`avatar_${data.user.id}`);
        setAvatar(cached || data.user.user_metadata?.avatar_url || "/placeholder.svg");
      }
    });
  }, []);

  // Handle username update
  const handleUsernameUpdate = async () => {
    if (!user?.id || !username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    setUsernameLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem(`username_${user.id}`, username.trim());
      
      // Also update in Supabase user metadata for backup
      await supabase.auth.updateUser({
        data: { ...user.user_metadata, username: username.trim() },
      });
      
      toast.success("Username updated successfully!");
    } catch (error) {
      toast.error("Failed to update username");
      console.error("[ERROR] Username update failed", error);
    } finally {
      setUsernameLoading(false);
    }
  };

  // Handle avatar file select
  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
  };

  // Handle crop complete
  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // Save cropped avatar
  const saveCroppedAvatar = async () => {
    try {
      if (!imageSrc) return;
      const croppedImg = await getCroppedImg(imageSrc, crop, zoom, 1);
      setAvatar(croppedImg);
      setShowCrop(false);
      // Save to localStorage
      if (user?.id) {
        localStorage.setItem(`avatar_${user.id}`, croppedImg);
      }
      // Update in Supabase user metadata
      await supabase.auth.updateUser({
        data: { ...user.user_metadata, avatar_url: croppedImg },
      });
      toast.success("Profile image updated!");
    } catch (err) {
      toast.error("Failed to update avatar");
      console.error("[ERROR] Avatar update failed", err, { imageSrc, crop, zoom });
    }
  };

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      toast.error(error.message);
      console.error("[ERROR] Password update failed", error, { newPassword });
    } else {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Section */}
          <Card className="w-200">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Manage your profile details and avatar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4 sm:items-start">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatar} alt={username || email || "User"} />
                    <AvatarFallback className="text-lg">
                      {username?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto"
                  >
                    Change Avatar
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarChange}
                  />
                </div>

                {/* Profile Fields */}
                <div className="flex-1 space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email"
                      value={email} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="username"
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleUsernameUpdate}
                        disabled={usernameLoading}
                        size="sm"
                      >
                        {usernameLoading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Avatar Crop Modal */}
              {showCrop && typeof imageSrc === 'string' && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-4">
                    <h4 className="font-medium">Crop your image</h4>
                    <div className="relative w-full h-64 bg-background rounded-lg overflow-hidden border">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCrop(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={saveCroppedAvatar}>
                        Save Image
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card className="w-200">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Update your password and security settings
              </CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordUpdate}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div className="grid gap-3 ">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground mt-4">
                  Password must be at least 6 characters long
                </p>
                <Button type="submit" disabled={pwLoading} className = "mt-5">
                  {pwLoading ? "Updating..." : "Update Password"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

      
        </div>
      </div>
    
  );
}