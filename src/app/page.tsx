import styles from "@/styles/sti-login.module.css";
// import "@/styles/sti-login.module.css"
import SignInButton from "@/components/signin-button";
import Image from "next/image";

export default function Home() {
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
                        />
                    </div>
                </div>


                <div className={styles.title}>
                    <h1>Login Now</h1>
                </div>

                <SignInButton />


                {/* 
                <div className={styles.helpLink}>
                    <a href="#">
                        Having trouble logging in? Click here
                    </a>
                </div> */}

                <div className={styles.footer}>
                    © WebC, Inc. All Rights Reserved.
                </div>
            </div>

        </div>
    );
}
