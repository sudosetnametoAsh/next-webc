

import styles from "@/styles/sti-login.module.css";
import Image from "next/image";
import SignInButton from "./auth/signin-button";
import AzureLoginButton from "./auth/azure-sign-in-button";

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

<<<<<<< HEAD
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

                {/* <SignInButton /> */}
                <AzureLoginButton />

                <div className={styles.footer}>
                    © WebC, Inc. All Rights Reserved.
                </div>
            </div>
=======
          <SignInButton />
>>>>>>> c65578e (added students-list-view, viewing overall students in that section)

          <p className={styles.footer}>© WebC, Inc. All Rights Reserved.</p>
        </div>
<<<<<<< HEAD
    )
}
=======
      </div>
    </div>
  );
}
>>>>>>> c65578e (added students-list-view, viewing overall students in that section)
