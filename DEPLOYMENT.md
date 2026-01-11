# Romanian Forest Auction - Production Deployment Guide

## Prerequisites Checklist

Before deploying to production, ensure you have:

- [ ] GitHub repository with code pushed
- [ ] Firebase project created with Firestore database
- [ ] Firebase service account JSON (for server-side auth)
- [ ] OpenAI API key (for OCR features)
- [ ] Custom domain name (if using)
- [ ] All API keys rotated (if .env was previously exposed)

---

## Step 1: Security Pre-Deployment (CRITICAL!)

### 1.1 Verify .env is NOT in Git

```bash
# Check if .env is tracked
git ls-files | grep .env

# If it returns nothing, you're good!
# If it shows .env, remove it:
git rm --cached .env
git commit -m "Remove .env from repository"
git push
```

### 1.2 Rotate All API Keys (IF Previously Exposed)

**Firebase Admin:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Download JSON file
5. Update your local `.env` file with new credentials

**Firebase Client (Web App):**
1. Go to Firebase Console → Project Settings → General
2. Under "Your apps" → Web app
3. Delete old app and create new one (to get new API key)
4. Update `.env` with new `VITE_FIREBASE_*` values

**OpenAI API:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Revoke old key
3. Create new key
4. Update `OPENAI_API_KEY` in `.env`

---

## Step 2: Code Preparation

### 2.1 Update CORS Configuration

Edit `cors.json` and replace placeholder with your actual domain:

```json
{
  "origin": [
    "http://localhost:5000",
    "http://localhost:5174",
    "https://silvador-mlp-marketplace-app.web.app",
    "https://yourdomain.com",
    "https://www.yourdomain.com"
  ],
  ...
}
```

### 2.2 Test Production Build Locally

```bash
# Build the application
npm run build

# Start production server
npm start

# Test in browser at http://localhost:5000
# Verify key features work:
# - User login/register
# - Create auction
# - Upload APV document
# - Place bids
```

### 2.3 Commit Code Changes

```bash
git add .
git commit -m "chore: prepare for production deployment"
git push
```

---

## Step 3: Deploy to Railway (Recommended)

### 3.1 Create Railway Account

1. Go to [Railway.app](https://railway.app/)
2. Sign up with GitHub
3. Authorize Railway to access your repositories

### 3.2 Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `romanian-forest-auction` repository
4. Railway will automatically detect Node.js project

### 3.3 Configure Build Settings

Railway should auto-detect these, but verify:

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Node Version:** 20.x (auto-detected from package.json)

### 3.4 Set Environment Variables

In Railway dashboard, go to Variables tab and add:

#### Firebase Client (Public - Safe to expose):
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Firebase Admin (SECRET):
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Note:** For `FIREBASE_PRIVATE_KEY`, make sure to include the actual newlines (`\n`) characters!

#### OpenAI (SECRET):
```
OPENAI_API_KEY=sk-proj-your_openai_api_key
```

#### Server Config:
```
NODE_ENV=production
PORT=5000
```

### 3.5 Deploy

1. Click "Deploy"
2. Railway will build and deploy automatically
3. Wait for deployment to complete (~2-5 minutes)
4. Railway will provide a URL like: `yourapp.up.railway.app`

### 3.6 Test Deployment

1. Visit the Railway-provided URL
2. Test all features:
   - [ ] Homepage loads
   - [ ] User can register/login
   - [ ] Create auction works
   - [ ] Document upload works
   - [ ] Bidding works
   - [ ] Notifications work

---

## Step 4: Custom Domain Setup

### 4.1 Add Domain in Railway

1. In Railway dashboard → Settings
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `silvador.ro`)
4. Railway will provide DNS settings

### 4.2 Update DNS Records

At your domain registrar (e.g., GoDaddy, Namecheap), add:

**For root domain (silvador.ro):**
```
Type: A Record
Name: @
Value: [Railway IP address provided]
TTL: 3600
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: [Railway provided domain].railway.app
TTL: 3600
```

### 4.3 Wait for DNS Propagation

- DNS changes can take 1-48 hours to propagate
- Check status: `nslookup yourdomain.com`
- Railway will automatically provision SSL certificate

### 4.4 Update CORS Configuration

Update `cors.json` again (if needed) and redeploy:

```json
{
  "origin": [
    "http://localhost:5000",
    "https://yourdomain.com",
    "https://www.yourdomain.com"
  ],
  ...
}
```

```bash
git add cors.json
git commit -m "update CORS for production domain"
git push
```

Railway will auto-deploy on git push.

---

## Step 5: Firebase Configuration Updates

### 5.1 Update Firebase Storage CORS

Apply CORS configuration to Firebase Storage bucket:

```bash
# If you haven't already set CLOUDSDK_PYTHON:
set CLOUDSDK_PYTHON=C:\Python313\python.exe  # Windows
# OR
export CLOUDSDK_PYTHON=/usr/bin/python3.13   # Mac/Linux

# Apply CORS
gsutil cors set cors.json gs://your-project-id.firebasestorage.app
```

### 5.2 Update Firebase Authorized Domains

1. Go to Firebase Console → Authentication → Settings
2. Under "Authorized domains", add:
   - `yourapp.up.railway.app` (Railway domain)
   - `yourdomain.com` (your custom domain)
   - `www.yourdomain.com`

### 5.3 Update Firestore Security Rules

Ensure production-ready security rules are applied:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Add your security rules here
    // Example: Only authenticated users can read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Step 6: Monitoring & Maintenance

### 6.1 Set Up Health Check Monitoring

Use a free uptime monitoring service:

**UptimeRobot (Free):**
1. Go to [UptimeRobot.com](https://uptimerobot.com/)
2. Create free account
3. Add monitor:
   - Type: HTTP(s)
   - URL: `https://yourdomain.com/health`
   - Interval: 5 minutes
4. Add email/SMS alerts

### 6.2 Set Up Error Tracking (Optional)

**Sentry (Free tier available):**
1. Go to [Sentry.io](https://sentry.io/)
2. Create project for Node.js
3. Install SDK: `npm install @sentry/node`
4. Add to `server/index.ts`:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV
});
```

### 6.3 Monitor Railway Logs

In Railway dashboard:
- Click "Deployments" → View logs
- Watch for errors during deployment
- Monitor runtime logs for issues

---

## Step 7: Post-Deployment Checklist

After deployment, verify:

- [ ] Application is accessible at custom domain
- [ ] SSL certificate is active (HTTPS works)
- [ ] Health check endpoint returns 200 OK: `https://yourdomain.com/health`
- [ ] All Firebase features work (auth, database, storage)
- [ ] Document upload works (CORS configured correctly)
- [ ] Notifications work
- [ ] Bidding system works
- [ ] OCR extraction works
- [ ] No console errors in browser
- [ ] Mobile responsive
- [ ] Lighthouse score > 80

---

## Troubleshooting

### Issue: Build fails on Railway

**Solution:**
- Check Railway logs for specific error
- Verify all dependencies are in `package.json`
- Ensure Node version is compatible (20.x recommended)

### Issue: Application crashes on startup

**Solution:**
- Check environment variables are set correctly
- Verify `FIREBASE_PRIVATE_KEY` has correct newlines
- Check Railway logs for error messages

### Issue: Firebase connection fails

**Solution:**
- Verify Firebase credentials are correct
- Check Firebase project ID matches
- Ensure service account has correct permissions

### Issue: CORS errors on document upload

**Solution:**
- Verify `cors.json` is correctly configured
- Re-apply CORS: `gsutil cors set cors.json gs://your-bucket`
- Check Firebase Storage bucket name matches

### Issue: "Cannot find module" errors

**Solution:**
- Run `npm install` locally
- Commit `package-lock.json`
- Push to trigger redeploy

---

## Rollback Procedure

If deployment fails or has critical issues:

### Railway Rollback:
1. Go to Railway dashboard → Deployments
2. Find previous working deployment
3. Click "Redeploy"

### Git Rollback:
```bash
# View commit history
git log --oneline

# Revert to previous commit
git revert HEAD

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force
```

---

## Maintenance

### Regular Tasks:

**Weekly:**
- Check Railway logs for errors
- Monitor uptime reports
- Review Firebase usage (stay within free tier)

**Monthly:**
- Update dependencies: `npm update`
- Check for security vulnerabilities: `npm audit`
- Review and rotate API keys (if needed)
- Backup Firestore data

**Quarterly:**
- Review Firebase security rules
- Audit user access and permissions
- Performance optimization review
- Cost analysis (if on paid tier)

---

## Scaling Considerations

When your application grows:

### Performance:
- Enable Firebase caching
- Implement Redis for sessions
- Use CDN for static assets
- Add database indexes

### Cost Optimization:
- Monitor Railway usage (CPU, memory, bandwidth)
- Optimize Firestore queries (use indexes)
- Implement pagination for large lists
- Cache frequently accessed data

### Infrastructure:
- Consider moving to dedicated infrastructure (AWS, GCP)
- Implement load balancing
- Add database replication
- Set up CI/CD pipeline (GitHub Actions)

---

## Support & Resources

- **Railway Docs:** https://docs.railway.app/
- **Firebase Docs:** https://firebase.google.com/docs
- **Node.js Docs:** https://nodejs.org/docs/
- **Railway Community:** https://discord.gg/railway

---

## Security Best Practices

1. **Never commit sensitive data** (.env files)
2. **Rotate API keys regularly** (every 90 days)
3. **Use environment variables** for all secrets
4. **Keep dependencies updated** (`npm update`)
5. **Monitor for vulnerabilities** (`npm audit`)
6. **Use HTTPS only** (Railway handles this)
7. **Implement rate limiting** (to prevent abuse)
8. **Regular security audits** (quarterly)
9. **Backup data regularly** (Firestore exports)
10. **Monitor logs for suspicious activity**

---

## Estimated Costs (Monthly)

- **Railway:** €20-50 (depending on usage)
- **Firebase:** €0 (free tier sufficient for <100 users)
- **Domain:** €10-15/year (~€1.25/month)
- **Uptime Monitoring:** €0 (UptimeRobot free tier)
- **Error Tracking:** €0 (Sentry free tier)

**Total: ~€21-51/month** for production-ready hosting

---

## Next Steps After Deployment

1. **User Testing:** Invite 10-20 beta users
2. **Collect Feedback:** Use forms or analytics
3. **Iterate:** Fix bugs, improve UX
4. **Marketing:** Launch campaign to forest owners/buyers
5. **Monitor:** Track KPIs (users, auctions, revenue)
6. **Scale:** Implement payment system (Phase 1 of enhancement plan)

---

Last Updated: October 29, 2025
Deployment Target: Railway (https://railway.app)
Production URL: TBD after deployment
