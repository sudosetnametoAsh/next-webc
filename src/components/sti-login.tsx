"use client";

import { loginRequest } from "@/lib/msal/msal-config";
import { useMsal } from "@azure/msal-react";
import useRoleRedirect from "@/hooks/use-role";
import styles from "@/styles/sti-login.module.css";

export default function STILogin() {
    const { instance, accounts, inProgress } = useMsal();

    useRoleRedirect();

    const handleLogin = () => {
        instance.loginRedirect(loginRequest).catch((error: any) => console.log(error));
    };

    // if (inProgress !== InteractionStatus.None) {
    //     return (
    //         <div className={styles.container}>
    //             <div className={styles.loginCard}>
    //                 <p>Loading...</p>
    //             </div>
    //         </div>
    //     );
    // }

    // if (accounts.length > 0) {
    //     return (
    //         <div className={styles.container}>
    //             <div className={styles.loginCard}>
    //                 <p>Fetching Data...</p>
    //             </div>
    //         </div>
    //     );
    // }

    return (
        <div className={styles.container}>
            
            <div className={styles.logoTopLeft}>
                <img src="/stilogo.png" alt="STI Logo" />
            </div>

           
            <div className={styles.loginCard}>
               
                <div className={styles.logoCenter}>
                    <div className={styles.logoBox}>
                        <img src="/stilogo.png" alt="STI Logo" />
                    </div>
                </div>

                
                <div className={styles.title}>
                    <h1>Login Now</h1>
                </div>

                
                <button 
                    onClick={handleLogin}
                    className={styles.loginButton}
                >
                    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#ffffff" d="M4 7.81L21.63 5.1v17.57H4V7.81zM4 25.33h17.63v17.57L4 40.17V25.33zm19.72-20.8L44 2v20.67H23.72V4.53zM44 24.67V46l-20.28-2.47V24.67H44z"/>
                    </svg>
                    <span>SIGN IN WITH YOUR STI G365 ACCOUNT</span>
                </button>

                {/* 
                <div className={styles.helpLink}>
                    <a href="#">
                        Having trouble logging in? Click here
                    </a>
                </div> */}

                {/* Footer */}
                <div className={styles.footer}>
                    © WebC, Inc. All Rights Reserved.
                </div>
            </div>

        </div>
    );
}