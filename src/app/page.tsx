"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import Draft from "@/components/token-validator";
import Login from "@/components/login";

export default function Home() {
    const { inProgress } = useMsal()
    const isAuthenticated = useIsAuthenticated()

    if (inProgress !== "none") {
        return null
    }

    console.log(inProgress, isAuthenticated)

    return (
        <>
            {isAuthenticated ? <Draft /> : <Login />}
        </>
    );
}
