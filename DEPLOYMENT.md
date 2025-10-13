# Deployment Guide

## Automatic Deployment

This project uses GitHub Actions for automatic deployment to Cloudflare Pages.

### How it works

1. Push code to `main` branch
2. GitHub Actions workflow triggers
3. Application builds and deploys to https://umuo.app

### Required GitHub Secrets

Configure these in your repository settings:

- `GROQ_API_KEY` - Groq AI service API key
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Pages permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_ZONE_ID` - Your domain zone ID

## Manual Deployment

### Local Deployment

```bash
# Build the application
pnpm build

# Deploy to Cloudflare Pages
pnpm deploy:prod
```

### Preview Deployment

```bash
# Deploy to preview environment
pnpm deploy:preview
```

## Environment Variables

### Production
- Uses GitHub Secrets configured in the repository
- Automatically injected during deployment

### Development
- Use `.env.local` file for local development
- Never commit this file to version control

## Monitoring

- **GitHub Actions**: Repository → Actions tab
- **Cloudflare Pages**: Cloudflare Dashboard → Pages
- **Live Site**: https://umuo.app

## Troubleshooting

### Build Failures
1. Check GitHub Actions logs
2. Verify all required secrets are configured
3. Ensure pnpm-lock.yaml is up to date

### Deployment Issues
1. Verify Cloudflare API token permissions
2. Check account and zone IDs
3. Review Cloudflare Pages build logs

### Performance Issues
1. Monitor Core Web Vitals in Cloudflare Analytics
2. Check bundle size in build output
3. Review CDN caching configuration