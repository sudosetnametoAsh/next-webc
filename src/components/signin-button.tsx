"use client";

import { loginRequest } from "@/lib/msal/msal-config";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import useRoleRedirect from "@/hooks/use-role";

export default function SignInButton() {
    const { instance, accounts, inProgress } = useMsal();

    useRoleRedirect();

    const handleLogin = () => {
        instance.loginRedirect(loginRequest).catch((error) => console.log(error));
    };

    if (inProgress !== InteractionStatus.None) {
        return <p>Loading...</p>;
    }

    if (accounts.length > 0) {
        return <p>Fetching Data...</p>;
    }

    return <button onClick={handleLogin}>Sign In</button>;
}
