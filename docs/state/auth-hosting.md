# Sign-in, Hosting and Email

## Live

- **Hosting:** production at https://biggers-playbook-shell.vercel.app, deployed from the GitHub repo that Lovable syncs. The Lovable address (https://biggers-playbook-shell.lovable.app) still works during the transition. Lovable is the editing tool only.
- **Sign-in:** passwordless. `/login` sends an email with both a magic link and a 6-digit code (verified with `verifyOtp`). The "Signing in inside the Lovable editor?" paste-link box is still on `/login`.
- **Sessions** persist long-term on the device. `useAuth` is pinned to `globalThis` so hot reload keeps auth state.
- **Account creation:** `handle_new_user()` creates the `employees` row only after the email is confirmed, linking pre-provisioned rows by email.
- **First login:** Staff pick their Division (and Path/Location where one exists); a duplicate-account check asks "is this you?".
- **Email:** Resend as custom SMTP for Supabase Auth, sending from `noreply@mail.biggersmarket.com` ("Biggers Market"). Auth email rate limit 100/hour. Template is plain language with a branded button and must include `{{ .Token }}` for the code.
- **Supabase Auth URLs:** Site URL is the Vercel address; Redirect URLs include the Vercel and Lovable addresses.

## Open

- End-to-end sign-in test from the Vercel site, including on a phone.
- Confirm Vercel has the Supabase URL and publishable key environment variables.
- Pick one staff-facing address, then remove the Lovable address from the redirect list.
- Remove the Lovable paste-link box from `/login` for non-editor users.
- README "Live app" line still lists the Lovable address.
- Optional: a custom subdomain (for example `training.biggersmarket.com`).
