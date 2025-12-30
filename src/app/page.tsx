"use client";

import Landing from "@/components/landing";
import AuthGate from "@/components/auth/auth-gate";

export default function Home() {
    console.log("in-root-page")
    return (
        <>
            <AuthGate>
                <Landing />
            </AuthGate>
        </>
    );
}
