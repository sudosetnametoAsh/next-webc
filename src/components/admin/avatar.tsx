"use client";

import { ComponentProps, useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

type AvatarProps = {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
} & Omit<ComponentProps<"div">, "children">;

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const Avatar = ({ name, src, size = "md", className = "", ...props }: AvatarProps) => {
  const { instance, accounts } = useMsal();
  const [fetchedImage, setFetchedImage] = useState<string | null>(null);

  
  const initials = (() => {
    if (!name) return "??";
    
    
    const cleanName = name.replace(/\s*\(.*?\)\s*/g, "").replace(/,/g, "").trim();
    
    const parts = cleanName.split(" ").filter((part) => part.length > 0);
    
    if (parts.length === 0) return "??";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    
    
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  
  useEffect(() => {
    
    if (src) return;

    let objectUrl: string | null = null;

    const fetchProfilePhoto = async () => {
      const account = accounts[0];
      if (!account) return;

      try {
        // Get Access Token
        const response = await instance.acquireTokenSilent({
          scopes: ["User.Read"],
          account: account,
        });

        // Fetch Photo
        const photoResponse = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
          headers: { Authorization: `Bearer ${response.accessToken}` },
        });

        if (photoResponse.ok) {
          const blob = await photoResponse.blob();
          objectUrl = URL.createObjectURL(blob);
          setFetchedImage(objectUrl);
        }
      } catch (error) {
        console.error("Could not fetch avatar", error);
      }
    };

    fetchProfilePhoto();

    
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, instance, accounts]);

 
  const activeSrc = src || fetchedImage;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 font-medium text-white ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {activeSrc ? (
        <img
          src={activeSrc}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="tracking-wider">{initials}</span>
      )}
    </div>
  );
};

export default Avatar;