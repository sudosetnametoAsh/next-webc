"use client";

import Landing from "@/components/landing";
import AuthGate from "@/components/auth-gate";

export default function Home() {

    return (
        <>
            <AuthGate>
                <Landing />
            </AuthGate>
        </>
    );
}
