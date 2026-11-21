# LiDAR portfolio

Vite + React + TS + three / react-three-fiber. Static build only.

```
npm install
npm run dev
npm run build
```

## Deploy to GitHub Pages

1. Repo → Settings → Pages → Source: **GitHub Actions**. Push to `main`.
2. Custom domain: rename `public/CNAME.example` to `public/CNAME` (contents: only your domain), and set the repo variable `VITE_BASE` to `/`.
   Without a custom domain the workflow uses `/<repo-name>/` automatically.
3. DNS: apex `A` records pointing at GitHub Pages, and a `www` `CNAME` to `username.github.io`.
   Take the current IPs from GitHub's official docs ("Managing a custom domain for your GitHub Pages site"), not from this file.

`404.html` is a copy of `index.html` so refreshes never break.
