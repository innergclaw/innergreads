export const READ_SLUG = "art-era";
export const READ_PRICE = 100;
export const READ_HOME = "https://www.innergreads.study/reads/";

export function activePaidMember(member: any, now = Date.now()): boolean {
  return Boolean(member?.status === "active" && member.payment_verified === true &&
    member.access_expires_at && Date.parse(member.access_expires_at) > now);
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

export const validSecret = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("");
}
