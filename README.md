# Ridgecore Trading Platform 🚀

Fully functional trading website built from static HTML landing page.

## Quick Local Run
```bash
cd ridgecore
node server-fixed.js
```
Open http://localhost:3000

## Production Deploy (Render.com - Free)

1. **Create GitHub Repo**
```bash
cd ridgecore
git init
git add .
git commit -m "Initial Ridgecore platform"
gh repo create ridgecore-trading --public --push
```

2. **Deploy to Render** (free tier):
   - Go to render.com → New Web Service → Connect GitHub repo
   - Build: `npm install`
   - Start: `node server-fixed.js`
   - Free URL: https://ridgecore-trading.onrender.com

## Features
- Real user registration/login (JWT + bcrypt)
- Live markets + trade execution
- Persistent trades/users (JSON files)
- Responsive dashboard
- Rate limiting + security

**Test:** Register `test@test.com` / `test` / `test123`
