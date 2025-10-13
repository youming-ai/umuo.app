# Quick Start Guide

## Prerequisites

- Node.js 18+
- pnpm package manager
- Groq API key (from https://console.groq.com)
- Cloudflare account (for deployment)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

## Environment Setup

Create `.env.local` with your secrets:
```env
GROQ_API_KEY=your_groq_api_key_here
```

## Development

```bash
pnpm dev
```

## Deployment

This project is configured for automatic deployment to Cloudflare Pages via GitHub Actions.

### Manual Deployment

```bash
pnpm deploy
```

### GitHub Secrets Configuration

Add these secrets to your GitHub repository:

- `GROQ_API_KEY` - Your Groq API key
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_ZONE_ID` - Your domain zone ID

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Cloudflare Pages](https://pages.cloudflare.com)
- [Groq API](https://console.groq.com/docs)