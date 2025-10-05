"use client";

import { loginRequest } from "@/lib/msal/msal-config";
import { useMsal } from "@azure/msal-react";
// import { InteractionStatus } from "@azure/msal-browser";
import useValidateToken from "@/hooks/use-validate-token";
import styles from "@/styles/sti-login.module.css";

export default function SignInButton() {
    const { instance } = useMsal();

    useValidateToken();

    const handleLogin = () => {
        instance.loginRedirect(loginRequest).catch((error) => console.log(error));
    };

    // if (inProgress !== InteractionStatus.None) {
    //     return <p>Loading...</p>;
    // }

    // if (accounts.length > 0) {
    //     return <p>Fetching Data...</p>;
    // }

    // return <button onClick={handleLogin}>Sign In</button>;
    return <button
        onClick={handleLogin}
        className={styles.loginButton}
    >
        <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill="#ffffff" d="M4 7.81L21.63 5.1v17.57H4V7.81zM4 25.33h17.63v17.57L4 40.17V25.33zm19.72-20.8L44 2v20.67H23.72V4.53zM44 24.67V46l-20.28-2.47V24.67H44z" />
        </svg>
        <span>SIGN IN WITH YOUR STI G365 ACCOUNT</span>
    </button>
}
