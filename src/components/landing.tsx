import EnrollmentNotice from "./auth/enrollment-notice";
import styles from "@/styles/sti-login.module.css";
import Image from "next/image";
import AzureLoginButton from "./auth/azure-sign-in-button";

export default function Login({ notEnrolled = false }: { notEnrolled?: boolean }) {
  return (
    <>
    <link rel="preload" as="image" href="/sti-login-mobile.webp" media="(max-width: 767px)" />
    <link rel="preload" as="image" href="/sti-login-desktop.webp" media="(min-width: 768px)" />
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

          {notEnrolled && <EnrollmentNotice />}
          <AzureLoginButton />

          <div className={styles.footer}>
            © WebC, Inc. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
