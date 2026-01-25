Render deployment instructions — Mellow Frontend

This file documents how to deploy the Mellow frontend as a Static Site on Render (https://render.com).

Prerequisites
- GitHub repo: https://github.com/Matrixuse/Mellow-Frontend-main (already pushed)
- Render account with GitHub access
- Backend is deployed and reachable: https://mellow-backend-main.onrender.com

1) Local build & quick test
- From project root:

```powershell
# install deps (once)
npm ci
# build the production bundle
npm run build
# preview using a static server (optional, requires serve or similar)
# npm i -g serve
# serve -s dist -l 5000
# open http://localhost:5000 to verify
```

2) Render: create a new Static Site
- In Render dashboard: New -> Static Site
- Connect GitHub and select repo `Matrixuse/Mellow-Frontend-main` and branch `main`.
- Settings:
  - Name: `mellow-frontend` (or any name you prefer)
  - Root Directory: `/` (if project root)
  - Build Command: `npm ci && npm run build`
  - Publish Directory: `dist`
  - Branch: `main`
- Environment variables (Render -> Static Site -> Environment):
  - `VITE_API_URL` = `https://mellow-backend-main.onrender.com`
  - (Optional) any analytics keys or runtime flags
- Click "Create Static Site" and watch the build logs. If a deploy fails, inspect logs in Render UI.

3) Runtime API selection
- This project reads the backend base URL from `import.meta.env.VITE_API_URL` at build time.
- We set `VITE_API_URL` as an environment variable in Render so the built files include the correct API base.
- For further flexibility, the app also supports `window.__API_URL` (if the host injects it) and falls back to `https://mellow-backend-main.onrender.com`.

4) Updating the site
- Any time you push to `main`, Render will automatically trigger a deploy (unless auto-deploy disabled).
- To force a redeploy with changed env vars: go to the Render static site -> Manual Deploy -> Deploy Latest Commit.

5) Custom domain (optional)
- In Render: Static Site -> Settings -> Custom Domains -> Add Domain
- Add your domain (e.g., `app.example.com`) and follow DNS instructions (CNAME to Render). Render will provision TLS automatically.

6) Debugging tips
- Build fails with missing script: ensure `package.json` has `build` script (this repo already has `vite build`).
- Network / CORS errors: Update backend CORS to allow the deployed frontend origin. In backend, add the Render frontend URL to allowed origins or set `ALLOWED_ORIGIN`.
- 404/asset errors: ensure `Publish Directory` is `dist` and build succeeds locally.

7) Quick checklist to hand to Render UI
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Env vars: `VITE_API_URL=https://mellow-backend-main.onrender.com`

If you'd like, I can:
- Walk you through the Render UI steps interactively (you click, I guide).
- Add a small runtime override: inject `window.__API_URL` through a tiny `public/init.js` file and load it in `index.html` so you can change API without rebuilding (I can add this patch).


