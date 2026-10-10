# Security

## Maintenance

No versions are supported. This repository is an unmaintained reference project and receives no security fixes. Anyone continuing development is responsible for reviewing and updating the code and dependencies before deployment.

## Known limitations

- **Browser storage credentials:** `src/utils/s3Upload.ts` reads `VITE_DO_ACCESS_KEY_ID` and `VITE_DO_SECRET_ACCESS_KEY`. Vite exposes these values in the browser bundle. Leave them blank; replace this flow with authenticated server uploads or short-lived presigned URLs before enabling uploads. Rotate any storage credentials previously used in a deployed frontend.
- **Dependency advisories:** the committed lockfile contains dependencies with known vulnerabilities, including critical advisories. Run `pnpm audit` and `pnpm audit --prod` for current results and update affected dependencies in any maintained fork. Passing build and unit checks does not establish deployment safety.
- **Server secrets:** keep Supabase service-role keys, Clerk secret keys, GitHub App private keys, Stripe secrets, and the encryption key in server environment variables. Never put them in `VITE_*` variables or tracked files.

## Review performed

On 2026-10-10, Gitleaks 8.30.1 detected no secrets in the tracked source snapshot or the 370 commits reachable from the fetched branches and tags. This is a scan result, not a guarantee that all credentials or deployment risks have been identified. Local environment files and external deployments were outside the scan.
