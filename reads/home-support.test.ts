import { paidSupport, settledSupport } from '../supabase/functions/innerg-reads/rules.ts';
const assert = (value: unknown) => { if (!value) throw new Error('assertion failed'); };
Deno.test('HOME BASE support cannot be confused with article payments', () => {
 const session = { status:'complete', payment_status:'paid',mode:'payment',currency:'usd',amount_total:300,
 metadata:{product_key:'home_base_support',read_slug:'home-base',support_amount:'300'},
 line_items:{data:[{quantity:1,price:{unit_amount:300,currency:'usd'}}]}};
 assert(paidSupport(session,'home-base'));
 assert(!paidSupport(session,'art-era'));
 assert(!paidSupport({...session,payment_status:'unpaid'},'home-base'));
 assert(!paidSupport({...session,amount_total:100},'home-base'));
 assert(!paidSupport({...session,metadata:{...session.metadata,product_key:'innerg_read_support'}},'home-base'));
 assert(!settledSupport({status:'processing'},300));
});
