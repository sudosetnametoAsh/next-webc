"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ duration = 2500, ...props }: ToasterProps) => {
  const { resolvedTheme = "light" } = useTheme()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const updateVisibility = () => setHidden(document.hidden)
    updateVisibility()
    document.addEventListener("visibilitychange", updateVisibility)
    return () => document.removeEventListener("visibilitychange", updateVisibility)
  }, [])

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      duration={duration}
      visibleToasts={3}
      closeButton
      gap={12}
      offset={24}
      mobileOffset={16}
      containerAriaLabel="Notifications"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--portal-surface)",
          "--normal-text": "var(--portal-foreground)",
          "--normal-border": "var(--portal-border)",
          "--border-radius": "var(--radius)",
          "--toast-duration": `${duration}ms`,
          "--toast-play-state": hidden ? "paused" : "running",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
