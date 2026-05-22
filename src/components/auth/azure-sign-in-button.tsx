"use client";

import styles from "@/styles/sti-login.module.css";
import { createClient } from "@/lib/db/supabase-client";

export default function AzureLoginButton() {
  const handleAzureLogin = async () => {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "email profile",
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      console.error("Error logging in:", error.message);
    }
  };

  return (
    <button
      // className="cursor-pointer border-2 border-black"
      className={styles.loginButton}
      onClick={handleAzureLogin}

    >

      <svg
        width="20"
        height="20"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#ffffff"
          d="M4 7.81L21.63 5.1v17.57H4V7.81zM4 25.33h17.63v17.57L4 40.17V25.33zm19.72-20.8L44 2v20.67H23.72V4.53zM44 24.67V46l-20.28-2.47V24.67H44z"
        />
      </svg>
      <span>SIGN IN WITH YOUR STI O365 ACCOUNT</span>
    </button>
  );
}
