# Student Clearance System

A modern web student clearance system built with Next.js 16, TypeScript, and Supabase.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure
```
src/
├── app/
│	├── globals.css			# Global styles
│	├── layout.tsx			# Root layout
│	├── page.tsx			# Login/Landing page
│	├── (pages)/				# App Router
│		├── layout.tsx			# Auth-protected layout
│		├── admin/				# Admin dashboard
│		├── department/			# Department interface
│		├── student/			# Student portal
│	└── api/				# API routes
├── components/			# React components
│		├── admin/			# Admin-specific components
│		├── auth/			# Authentication components
│		├── department/		# Department-specific components
│		├── student/		# Student-specific components
│		└── ui/				# Custom components
├── context/			# React contexts
├── hooks/				# Custom react hooks
│		├── admin/			  # Admin data fetching
│		├── auth/			  # Authentication hooks
│		├── department/	# Department data fetching
│		└── student/		# Student data fetching
├── lib/				# Utilities & configs
│		├── api/
│		├── auth/			# Authentication utils
│		├── msal/			# MSAL setup & configs
│		└── query/		# TanStack Query setup 
├── styles/				# Component styles
├── types/				# TypeScript type definitions
└── middleware.ts		# Route protection
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Authentication:** Azure MSAL (Microsoft Authentication Library)
- **Database:** Supabase
- **UI:** Radix UI
- **Styling:** TailwindCSS
- **State Management:** TanStack Query

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## CI/CD pipeline

The [CI/CD workflow](.github/workflows/ci.yml) runs in three ordered stages:

1. **Tests (quality gate)** — installs dependencies, runs `tsc --noEmit`, and runs the Node regression suite with `node --test tests/*.test.cjs`. A failure stops the pipeline. The separate `tests/motion-responsive.browser.cjs` browser check requires Playwright and Chromium and is not run by this gate.
2. **Build image** — builds the Docker image, starts the container, and smoke-tests `/` and `/favicon.svg`.
3. **Deploy to Dokploy** — after a successful build and publish on `main`, triggers a Dokploy redeploy through a webhook.

| Event | Tests | Build image | Publish to GHCR | Deploy |
| --- | --- | --- | --- | --- |
| Pull request | Yes | Yes | No | No |
| Push to `main` | Yes | Yes | Yes | Yes |
| Manual run on `main` | Yes | Yes | Yes | Yes |
| Manual run on another ref | Yes | Yes | No | No |

Require the **Tests (quality gate)** and **Build image** checks in branch protection so pull requests cannot merge without them.

### 1. Configure public build variables

Under **Settings → Secrets and variables → Actions → Variables**, add these repository variables:

| Variable | Production value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Your app's HTTPS origin, e.g. `https://clearance.example.edu` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your browser-accessible Supabase HTTPS URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase's public anon or publishable key (used by the browser client) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase's public publishable key (used by the server client/proxy) |

The current app reads both Supabase key names. Both variables can contain the same public anon or publishable key from your Supabase project. Never put a service-role or secret key in either variable. These values are public and are embedded during `next build`; changing container environment variables cannot replace them. Rebuild the image after changing them.

### 2. Configure Dokploy

Point the Dokploy application at the published image:

- **Docker image:** `ghcr.io/sudosetnametoash/next-webc:latest`. The workflow derives the lowercase image path from the repository, so forks use their own path.
- **Registry credentials:** for a private GHCR package, add credentials in Dokploy that can read the package (a personal access token with `read:packages`).
- **Deploy webhook:** open the application's **Deployments** tab and copy the webhook URL. It looks like `https://<dokploy-host>/api/deploy/<token>`.

Store the webhook URL as a repository secret under **Settings → Secrets and variables → Actions → Secrets**:

| Secret | Value |
| --- | --- |
| `DOKPLOY_WEBHOOK_URL` | The application Deploy Webhook URL from Dokploy |

Add the secret before merging a change to the workflow, otherwise the first `main` run fails at the deploy job. The deploy job fails with a clear error when the secret is missing or the webhook returns a non-2xx response. Treat the URL as a credential: anyone who has it can trigger deployments. Rotate the webhook token in Dokploy if it leaks.

Keep any Dokploy GitHub auto-deploy disabled. If Dokploy deploys directly on GitHub pushes, it can release code before the quality gate finishes. This workflow triggers the deployment explicitly, and GHCR pushes do not fire Dokploy's DockerHub webhook.

### 3. Publish and deploy

Merge into `main`. Open **Actions → CI/CD** to follow the run. A successful `main` run publishes:

```text
ghcr.io/sudosetnametoash/next-webc:latest
ghcr.io/sudosetnametoash/next-webc:sha-<full-commit-sha>
```

The image job pushes to GHCR only after the tests and smoke test pass. Images are built for Linux AMD64, matching the GitHub-hosted runner. PR builds never log in or publish. If organization policy blocks package writes, allow GHCR publishing for this repository; an existing package may also need to grant this repository Actions access under its package settings.

Dokploy pulls `:latest` when the deploy job triggers it. The job finishes once Dokploy accepts the webhook, not when the rollout completes; follow the deployment in Dokploy for the final status. Every run also publishes a `sha-<full-commit-sha>` tag for reproducible rollbacks.

To redeploy the current `main` commit without a new push, open **Actions → CI/CD → Run workflow** and select `main`. Manual runs on other refs only run the tests and build the image.

### 4. Runtime configuration

Configure these server-only variables in Dokploy under the application's **Environment** settings. When running the container manually, use a private `.env.production` file instead. Do not commit these values or pass them as Docker build arguments:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@DATABASE_HOST:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
AZURE_AD_TENANT_ID=YOUR_TENANT_ID
AZURE_AD_CLIENT_ID=YOUR_CLIENT_ID
SESSION_SECRET=YOUR_RANDOM_SESSION_SECRET
CASHIER_WEBHOOK_SECRET=YOUR_RANDOM_WEBHOOK_SECRET
# Required when using AI verification:
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
# Required when using the SMS gateway:
LOCAL_IP=http://YOUR_REACHABLE_SMS_GATEWAY
SMS_USERNAME=YOUR_SMS_USERNAME
SMS_PASSWORD=YOUR_SMS_PASSWORD
```

Generate independent session/webhook secrets with `openssl rand -hex 32`. When using a local file, restrict it with `chmod 600 .env.production`. The Docker build context includes only application source, public assets, and build configuration; local `.env` files, database backups, and development dependencies are not included in the runtime image.

### 5. Run manually on a server (fallback)

For a private GHCR package, log in on the server using a personal access token (classic) with `read:packages` and access to the package:

```bash
read -rsp 'GHCR read token: ' GHCR_TOKEN; echo
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io --username YOUR_GITHUB_USERNAME --password-stdin
unset GHCR_TOKEN
```

Use the commit tag from the successful workflow for a reproducible deployment:

```bash
docker pull ghcr.io/sudosetnametoash/next-webc:sha-<full-commit-sha>
docker run --detach --name webc --restart unless-stopped \
  --env-file .env.production \
  --publish 127.0.0.1:3000:3000 \
  ghcr.io/sudosetnametoash/next-webc:sha-<full-commit-sha>
```

Replace `<full-commit-sha>` before running these commands. Put an HTTPS reverse proxy on the same server in front of `127.0.0.1:3000`, preserving the original `Host` and setting `X-Forwarded-Host` and `X-Forwarded-Proto`. If the proxy runs in Docker, use a shared Docker network and connect to `webc:3000` instead. For rollback, recreate the container using a previous successful commit tag and the same runtime configuration.

### Before exposing the app publicly

- Update `redirectUri` and `postLogoutRedirectUri` in [the MSAL config](src/lib/auth/msal-config.ts), which currently point to `http://localhost:3000`, and register the production redirect URI in Microsoft Entra. Its hardcoded client/tenant IDs must match the runtime Azure settings.
- Configure Supabase Auth's production Site URL and allowed redirect URL (`https://YOUR_DOMAIN/api/auth/callback`), and the Azure provider's callback URL. The checked-in Supabase config is for local development.
- Use a database, Supabase service, and SMS gateway reachable from the container. `localhost` inside it refers to the container itself. Provision the production database/schema separately; this image does not run migrations or host Supabase.
- Building, publishing, and triggering a Dokploy redeploy does not configure DNS/TLS or certify the app's authorization/security for public access.
