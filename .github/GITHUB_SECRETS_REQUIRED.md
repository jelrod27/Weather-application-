# Required GitHub Secrets for CI/CD

This project requires the following secrets to be configured in your GitHub repository settings for the Playwright tests and deployment to work correctly:

## Required Secrets

### Vercel Deployment
- `VERCEL_TOKEN` - Your Vercel authentication token
- `VERCEL_PROJECT_ID` - The Vercel project ID
- `VERCEL_ORG_ID` - Your Vercel organization/team ID

### Supabase Authentication
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)

### Optional Weather APIs
- `GOOGLE_POLLEN_API_KEY` - Google Pollen API key (recommended for US pollen coverage; Open-Meteo CAMS is the fallback)

Primary weather, forecast, UV, air quality, and precipitation data use Open-Meteo and do not require an API key.

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name listed above

## Vercel Environment Variables

For Playwright tests to work correctly against Vercel preview deployments, you need to configure the following environment variable in your Vercel project:

### Required for Playwright Tests in Vercel Preview

- `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE` - Set to `true` to enable test mode bypass in middleware

### How to Add Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE` with value `true`
4. Select **Preview** environment (or all environments if you want)
5. Click **Save**

**Note:** The middleware will automatically detect Vercel preview environments (`VERCEL_ENV=preview`) and allow test mode bypass when the test header/cookie is present. However, explicitly setting `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE=true` in Vercel is recommended for clarity and reliability.

## Important Notes

- Weather endpoints do not require OpenWeatherMap keys
- Make sure to use the same API keys in your GitHub secrets as in your local `.env.local` file
- For Vercel preview deployments, ensure `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE=true` is set in Vercel's environment variables
