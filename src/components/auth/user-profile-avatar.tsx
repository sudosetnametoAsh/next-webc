"use client";

import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

interface UserProfileAvatarProps {
  name: string;
}

export function UserProfileAvatar({ name }: UserProfileAvatarProps) {
  const { instance, accounts } = useMsal();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // --- FIXED FUNCTION ---
  const getInitials = (fullName: string) => {
    if (!fullName) return "??";

    // 1. Remove text inside parentheses (e.g., "(Student)")
    // 2. Remove commas
    // 3. Trim extra spaces
    const cleanName = fullName.replace(/\s*\(.*?\)\s*/g, "").replace(/,/g, "").trim();

    // Split into words
    const parts = cleanName.split(" ").filter(part => part.length > 0);

    if (parts.length === 0) return "??";
    
    // If only one word (e.g. "Jaro"), take first 2 letters
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }

    // Otherwise take first letter of First Name and First letter of Last Name
    // parts[0][0] = First char of first word
    // parts[parts.length - 1][0] = First char of last word
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      const account = accounts[0];
      if (!account) return;

      try {
        const response = await instance.acquireTokenSilent({
          scopes: ["User.Read"],
          account: account,
        });

        const photoResponse = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
          headers: { Authorization: `Bearer ${response.accessToken}` },
        });

        if (photoResponse.ok) {
          const blob = await photoResponse.blob();
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
      } catch (error) {
        // console.log("No profile photo found.");
      }
    };

    fetchProfilePhoto();
  }, [instance, accounts]);

  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt="Profile" 
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-slate-600"
      />
    );
  }

  return (
    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm">
      {getInitials(name)}
    </div>
  );
}