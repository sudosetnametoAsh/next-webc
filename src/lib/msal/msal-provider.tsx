"use client";

import React from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./msal-config";

const msalInstance = new PublicClientApplication(msalConfig);

export default function MSALProvider({ children }: { children: React.ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  )
}
