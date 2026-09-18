export const READ_SLUG = "art-era";
export const READ_SLUGS = new Set([READ_SLUG, "pull-the-plug-on-intelligence", "philly-money-moving", "black-men-step-up"]);
export const READ_PRICE = 100;
export const READ_HOME = "https://www.innergreads.study/reads/";
export const SUPPORT_MIN = 100;
export const SUPPORT_MAX = 500;

export function activePaidMember(member: any, now = Date.now()): boolean {
  return Boolean(member?.status === "active" && member.payment_verified === true &&
    member.access_expires_at && Date.parse(member.access_expires_at) > now);
}

export function memberCanRead(member: any, now = Date.now()): boolean {
  // The ID and original-member flag must come from the trusted membership row.
  const hasId = typeof member?.membership_number === "string" && member.membership_number.trim().length > 0;
  if (!hasId || member.status !== "active") return false;
  return member.access_source === "grandfathered" || activePaidMember(member, now);
}

export function paidRead(session: any, secretHash: string): boolean {
  const item = session.line_items?.data;
  return Boolean(session.status === "complete" && session.payment_status === "paid" &&
    session.mode === "payment" && session.currency === "usd" && session.amount_total === READ_PRICE &&
    session.metadata?.product_key === "innerg_read" && session.metadata?.read_slug === READ_SLUG &&
    session.metadata?.access_hash === secretHash &&
    item?.length === 1 && item[0].quantity === 1 && item[0].price?.unit_amount === READ_PRICE &&
    item[0].price?.currency === "usd");
}

export function settledCharge(intent: any): boolean {
  const charge = intent?.latest_charge;
  return Boolean(intent?.status === "succeeded" && intent.amount_received === READ_PRICE &&
    intent.currency === "usd" && charge && typeof charge === "object" &&
    charge.paid && !charge.disputed && !charge.refunded && charge.amount_refunded === 0);
}

export const validSupportAmount = (amount: unknown): amount is number =>
  Number.isInteger(amount) && Number(amount) >= SUPPORT_MIN && Number(amount) <= SUPPORT_MAX && Number(amount) % 100 === 0;

export const validReadSlug = (value: unknown): value is string => typeof value === "string" && READ_SLUGS.has(value);

export function paidSupport(session: any, readSlug = READ_SLUG): boolean {
  const amount = Number(session.metadata?.support_amount);
  const item = session.line_items?.data;
  return Boolean(validSupportAmount(amount) && session.status === "complete" && session.payment_status === "paid" &&
    session.mode === "payment" && session.currency === "usd" && session.amount_total === amount &&
    session.metadata?.product_key === (readSlug === "home-base" ? "home_base_support" : "innerg_read_support") && session.metadata?.read_slug === readSlug &&
    item?.length === 1 && item[0].quantity === 1 && item[0].price?.unit_amount === amount && item[0].price?.currency === "usd");
}

export function settledSupport(intent: any, amount: number): boolean {
  const charge = intent?.latest_charge;
  return Boolean(validSupportAmount(amount) && intent?.status === "succeeded" && intent.amount_received === amount &&
    intent.currency === "usd" && charge && typeof charge === "object" && charge.paid && !charge.disputed &&
    !charge.refunded && charge.amount_refunded === 0);
}

export const validSecret = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("");
}
