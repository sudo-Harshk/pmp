# Deployment (Vercel)

This is a **static** Vite SPA, so it deploys to any static host. Vercel is the recommended path — free for hobby projects and one-command to set up.

## Why `vercel.json`?

Vite produces static files under `dist/`. The app is a single-page app with client-side routing controlled by React state (not URL routes), so every path should serve `index.html`. This rewrite handles that:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## One-Click Deploy (recommended)

1. Push the repo to GitHub (this repo: `sudo-Harshk/pmp`).
2. Go to [vercel.com](https://vercel.com) and **Add New → Project**.
3. Import the GitHub repo. Vercel auto-detects Vite and fills in:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. **Before deploying**, add the Firebase env vars under **Settings → Environment Variables** so the app can reach your Realtime Database:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

   Add these for **Production** (and Preview if you want preview deployments to work).
5. Click **Deploy**. Vercel returns a live URL like `https://pmp.vercel.app`.

> The committed `.env.example` contains empty placeholders. Vercel's build uses only the environment variables you configure in the dashboard (or the `VITE_` prefix ones Vercel injects), so it's safe.

## CLI Deploy (alternative)

```bash
npm i -g vercel
vercel          # interactive setup + preview
vercel --prod   # deploy to production
```

Vercel reads `vercel.json` for the rewrite rule. Use `vercel env add VITE_FIREBASE_API_KEY` etc. if you prefer the CLI.

## After Deploy — Critical

Before real teammates can play, set your **Firebase Realtime Database security rules** so anonymous clients can read/write room data but you don't leave the database wide open. See [`FIREBASE_RULES.md`](./FIREBASE_RULES.md).

## Production Build Checks

```bash
npm run typecheck   # zero TS errors
npm test            # all unit tests pass
npm run build       # clean dist/ output
```

A successful `npm run build` produces `dist/` — the exact folder Vercel serves.
