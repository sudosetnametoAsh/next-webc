"use client";

import { loginRequest } from "@/lib/msal/msal-config";
import { useMsal } from "@azure/msal-react";


export default function SignInButton() {
    const { instance } = useMsal();

    const handleLogin = () => {
        instance.loginRedirect(loginRequest).catch((error) => console.log(error));
    };

    return <button onClick={handleLogin}>Sign In</button>;
};

