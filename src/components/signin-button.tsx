"use client";

import { loginRequest } from "@/lib/msal/msal-config";
import { useMsal } from "@azure/msal-react";
import useRoleRedirect from "@/hooks/use-role";


export default function SignInButton() {
    const { instance } = useMsal();

    useRoleRedirect()

    const handleLogin = () => {
        instance.loginRedirect(loginRequest).catch((error) => console.log(error));
    };

    return <button onClick={handleLogin}>Sign In</button>;
};

