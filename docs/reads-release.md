# personal reads, first release

## route and offer

- `https://www.innergreads.study/reads/`
- first essay: welcome to the a.r.t. era.
- the full essay is public. no account or payment is required to finish it.
- after the essay, readers can optionally support future innerg reads with a one-time USD 1, 2, 3, 4 or 5 contribution through Stripe Checkout.
- sign-in remains available only for saving a bookmark to an innerg account.

## public reading and privacy

the manuscript remains in `innerg_reads`. browser roles cannot query that table directly. the `innerg-reads` edge function returns the published essay and approved anonymous notes to the allowed innerg reads origins. it uses `Cache-Control: no-store` and never exposes the service-role key.

authenticated bookmark actions use the Supabase Auth server to verify the access token. authorization does not use user metadata. bookmark policies continue to restrict each account to its own rows.

anonymous notes use a random browser reader id. the service stores only a salted one-way hash and allows one note per reader per UTC day. notes remain private until reviewed. use the private Founder Dashboard comment inbox to approve or deny a note, and never publish personal details or abuse.

approved notes display their original submission date and time in Eastern time. the visible edt or est label follows the offset at submission. the semantic time element preserves the UTC instant. missing or invalid dates are omitted instead of replaced with an invented timestamp.

three native dropdowns appear before the essay: actions, reactions, and transactions. each gives a short introduction based on the published essay. they support keyboard controls and work without JavaScript. the essay and the optional support offer are unchanged.

## optional support

the support control is after the final essay paragraph. the native range input accepts whole-dollar choices from USD 1 through USD 5 and defaults to USD 3. the chosen amount is visible in the button before checkout.

the server validates the amount and creates a one-time Stripe Checkout Session with inline price data. support does not unlock content, create membership or change an existing subscription. a random support intent and Stripe idempotency key prevent duplicate sessions on retry. `innerg_read_supports` stores hashed intent and IP values, amount, session id and confirmation state. browser roles have no access to this table. an hourly attempt limit reduces checkout-session abuse.

the success URL contains Stripe's literal `{CHECKOUT_SESSION_ID}` placeholder. after Stripe redirects back, the server retrieves the session and confirms the exact product, read slug, amount, paid status, settled payment intent, and non-refunded, non-disputed charge before showing a confirmed message. Stripe remains the payment source of truth.

the previous USD 1 read-unlock records and signed webhook handler remain intact for historical payment records, but new visitors do not use that flow.

## editorial source

source conversation: `A R T Framework Rewrite`, id `6a9a42b4-4848-83e9-b657-22a7fd4e31aa`.

the edition keeps the actions, reactions and relationship-expectations argument. copy is lowercase, with short fragments grouped for reading. the old subscriber-count promotion and an unverified NFL allegation remain excluded. the public edition is about 1,820 words.

## verification

focused tests cover the public full-read response, signed-in bookmarks, anonymous notes, support amounts, exact Stripe product and amount checks, refunds and disputes, mobile overflow, keyboard focus, loading and error states, and reduced motion.

commands:

```sh
deno test reads/reads.test.ts
deno check supabase/functions/innerg-reads/index.ts
node --check reads/reads.mjs
node --test reads/comment-date.test.mjs
PLAYWRIGHT_MODULE=/path/to/playwright node reads/ui.test.cjs
```

do not claim a real support payment was tested unless an authorized live charge completes and the return confirmation is verified.
