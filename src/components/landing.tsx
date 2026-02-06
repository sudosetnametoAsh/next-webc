import styles from "@/styles/sti-login.module.css";
import Image from "next/image";
import SignInButton from "./auth/signin-button";

export default function Login() {
    return (
        <div className={styles.container}>

            <div className={styles.logoTopLeft}>
                <Image
                    src="/stilogo.png"
                    alt="STI Logo"
                    width={120}
                    height={120}
                    unoptimized />
            </div>


            <div className={styles.loginCard}>

                <div className={styles.logoCenter}>
                    <div className={styles.logoBox}>
                        <Image
                            src="/stilogo.png"
                            alt="STI Logo"
                            width={120}
                            height={120}
                            unoptimized
                            priority
                        />
                    </div>
                </div>


                <div className={styles.title}>
                    <h1>Login Now</h1>
                </div>

                <SignInButton />

                <div className={styles.footer}>
                    © WebC, Inc. All Rights Reserved.
                </div>
            </div>

        </div>
    )
}