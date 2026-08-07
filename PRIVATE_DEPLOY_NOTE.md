# Private deployment build

This package intentionally includes `.env` and `.env.local` for private testing.
Do not commit either environment file to a public repository.

Before production, configure the same variables in Vercel Project Settings → Environment Variables and remove secret-bearing env files from source control/artifacts.
