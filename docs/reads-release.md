# personal reads, first release

## route and offer

- `https://www.innergreads.study/reads/`
- first essay: welcome to the a.r.t. era.
- guests pay USD 1 once for this essay. this is not a subscription.
- active paid innerg id members have access while their paid membership remains active.
- the existing legacy in ink home page and book checkout remain in place.

## access and privacy

the full manuscript is stored in `innerg_reads`, not in this repository. browser roles have no access to that table. the `innerg-reads` function verifies a Supabase user with `auth.getUser` and checks `innerg_memberships`. authorization does not use user metadata.

included access requires `status=active`, `payment_verified=true`, and a future `access_expires_at`. existing unpaid grandfathered accounts are not changed and do not receive this new paid-read benefit automatically.

guest checkout starts with a random 256-bit reading key. the database stores only its SHA-256 hash. Stripe Checkout returns the key in the URL fragment. the page saves it to local storage and removes it from the address bar. the private link can be copied or downloaded for another device. it is a bearer link, so anyone who has it can use it. no automatic email of this key is implemented in v1.

the server checks the exact product, USD 1 amount, completed payment, settled charge, refunds and disputes before returning a guest read. the signed Stripe webhook records fulfillment independently of the return page. retries use a persisted attempt and Stripe idempotency key. revoked purchases stay revoked.

the shared `watchlist-stripe-webhook` baseline was fetched from deployed version 15. version 16 added a separate `innerg_read` branch before the member logic. subsequent patch preserves manual revocation. no membership, video or watchlist payment conditions were changed. keep this shared function coordinated with the other ecosystem repositories.

## notes and saved reads

bookmarks belong to the authenticated user. database policies enforce ownership. anonymous notes require an unlocked read, are capped at one per reader per UTC day, and remain private until reviewed. notes do not store the reader's name or email. the service uses a salted reader hash for repeat limits.

review notes in Supabase `innerg_read_feedback`. approve individual notes after checking for personal details or abuse. never expose the review table directly to browser roles.

## editorial source

source conversation: `A R T Framework Rewrite`, id `6a9a42b4-4848-83e9-b657-22a7fd4e31aa`.

the edition keeps the actions, reactions and relationship-expectations argument. copy is lowercase, with short fragments grouped for reading. the old subscriber-count promotion and an unverified NFL allegation were removed. the full protected edition is about 1,820 words.

## verification and remaining acceptance

automated tests cover paid membership, expired/unpaid access, wrong amount/currency/product/key, refunds/disputes, repeated webhook events, account return destinations, recovery, mobile overflow, keyboard focus, locked/member/guest views, bookmarks, notes and error handling.

commands:

```sh
deno test reads/reads.test.ts
node --test member-auth-flow.test.mjs
PLAYWRIGHT_MODULE=/path/to/playwright node reads/ui.test.cjs
```

the UI suite uses synthetic responses, not real member records. live checks separately confirm anonymous denial, direct database denial, unsigned webhook denial and an unpaid Stripe Checkout session. no real payment was charged. complete one authorized purchase and verify return, private-link reuse and anonymous feedback before promoting the offer as fully purchase-tested.

if a guest loses their key, verify the purchase in Stripe and ownership of the checkout email before support restores access. a screenshot or a claimed email alone is not proof. do not issue keys in public chat.

existing project advisories remain: [leaked-password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) and [pg_net is installed in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public). no new warning-level advisory was introduced. tables intended for service-only access deliberately have no browser policies.
