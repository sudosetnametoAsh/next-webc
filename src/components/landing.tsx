

import styles from "@/styles/sti-login.module.css";
import Image from "next/image";
import SignInButton from "./auth/signin-button";

export default function Login() {
  return (
    <div className={styles.container}>
      
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      
      <div className={styles.logoTopLeft}>
        <Image
          src="/stilogo.png"
          alt="STI Logo"
          width={48}
          height={48}
          unoptimized
        />
        <span className={styles.logoTopLeftText}></span>
      </div>

      
      <div className={styles.loginCard}>
        
        <div className={styles.accentBar} />

        <div className={styles.cardInner}>
          
          <div className={styles.logoCenter}>
            <div className={styles.logoRing}>
              <Image
                src="/stilogo.png"
                alt="STI Logo"
                width={64}
                height={64}
                unoptimized
                priority
              />
            </div>
          </div>

         
          <div className={styles.heading}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Sign in to your STI account</p>
          </div>

          
          <div className={styles.divider}>
            <span>continue with</span>
          </div>

          <SignInButton />

          <p className={styles.footer}>© WebC, Inc. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}