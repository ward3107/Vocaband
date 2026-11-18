export type Offer = {
  code: string;
  months: 1 | 12;
  agorot: number;
  recurring: boolean;
  itemId: number;
  page: string;
  endsAt: string | null;
};
type Environment = Record<string, string | undefined>;

export function hostedPage(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !['pay.sumit.co.il', 'app.sumit.co.il', 'www.myofficeguy.com', 'app.myofficeguy.com'].includes(
      url.hostname
    )
  ) {
    throw new Error('Invalid merchant payment page');
  }
  return url;
}

export function loadOffers(env: Environment, now = Date.now()): Offer[] {
  if (!env.SUMIT_COMPANY_ID || !env.SUMIT_API_KEY || env.VOCABAND_CHECKOUT_ENABLED !== 'true')
    return [];
  const entries: unknown = JSON.parse(env.VOCABAND_BILLING_OFFERS ?? '[]');
  if (!Array.isArray(entries)) throw new Error('Invalid billing offers');
  const seen = new Set<string>();
  return entries
    .map((v: Offer) => {
      if (
        !v ||
        !/^[a-z0-9_-]{1,40}$/.test(v.code) ||
        seen.has(v.code) ||
        ![1, 12].includes(v.months) ||
        !Number.isSafeInteger(v.agorot) ||
        v.agorot <= 0 ||
        !Number.isSafeInteger(v.itemId) ||
        v.itemId <= 0 ||
        typeof v.recurring !== 'boolean' ||
        (!v.recurring && v.months !== 12) ||
        (v.endsAt != null && !Number.isFinite(Date.parse(v.endsAt)))
      )
        throw new Error('Invalid billing offer');
      hostedPage(v.page);
      seen.add(v.code);
      return { ...v, endsAt: v.endsAt ?? null };
    })
    .filter((v) => !v.endsAt || Date.parse(v.endsAt) > now);
}

export function checkoutUrl(offer: Offer, order: string) {
  const url = hostedPage(offer.page);
  url.searchParams.set('externalidentifier', order);
  return url.href;
}
export function publicOffer({ code, months, agorot, recurring, endsAt }: Offer) {
  return { code, months, agorot, recurring, endsAt };
}

type MerchantPayment = {
  ID: number;
  CustomerID: number;
  DocumentID: number;
  Amount: number;
  Currency: number | string;
  Date: string;
  ValidPayment: boolean;
  ExternalIdentifier?: string;
  RecurringCustomerItemIDs?: number[];
};
type AccountingDocument = {
  DocumentID?: number;
  Document?: {
    ID?: number;
    Type?: number;
    DocumentType?: number;
    IsDraft?: boolean;
    OriginalDocumentID?: number;
  };
  Items?: { Item?: { ID?: number }; Quantity?: number }[];
};
type RecurringList = { RecurringItems: { ID: number; Status: number }[] };
type PaymentList = { Payments: MerchantPayment[]; HasNextPage: boolean };
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const positive = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

export function merchantApi(env: Environment, transport = fetch) {
  const CompanyID = Number(env.SUMIT_COMPANY_ID);
  if (!positive(CompanyID) || !env.SUMIT_API_KEY) throw new Error('Merchant account unavailable');
  async function call<T>(path: string, params: object): Promise<T> {
    const response = await transport('https://api.sumit.co.il' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ ...params, Credentials: { CompanyID, APIKey: env.SUMIT_API_KEY } }),
    });
    if (!response.ok) throw new Error('Merchant service unavailable');
    const body = await response.json();
    if (body.Status !== 0 && body.Status !== '0') throw new Error('Merchant request declined');
    return body.Data as T;
  }
  return {
    async get(id: number) {
      const data = await call<{ Payment: MerchantPayment }>('/billing/payments/get/', {
        PaymentID: id,
      });
      if (data?.Payment?.ID !== id) throw new Error('Unexpected merchant payment');
      return data.Payment;
    },
    document: (id: number) =>
      call<AccountingDocument>('/accounting/documents/getdetails/', { DocumentID: id }),
    list: (from: string, to: string, start: number) =>
      call<PaymentList>('/billing/payments/list/', {
        Date_From: from,
        Date_To: to,
        StartIndex: start,
      }),
    schedules: (customer: number) =>
      call<RecurringList>('/billing/recurring/listforcustomer/', {
        Customer: { ID: customer },
        IncludeInactive: true,
      }),
    cancel: (customer: number, standingOrder: number) =>
      call('/billing/recurring/cancel/', {
        Customer: { ID: customer },
        RecurringCustomerItemID: standingOrder,
      }),
  };
}

function bookedDocument(payment: MerchantPayment, document: AccountingDocument, types: number[]) {
  const doc = document.Document;
  return (
    !!doc &&
    doc.IsDraft === false &&
    (document.DocumentID ?? doc.ID) === payment.DocumentID &&
    types.includes(doc.Type ?? doc.DocumentType ?? -1) &&
    [0, 'ILS', 'NIS'].includes(payment.Currency)
  );
}
function agorot(value: number) {
  const rounded = Math.round(Math.abs(value) * 100);
  return positive(rounded) && Math.abs(Math.abs(value) * 100 - rounded) < 0.00001 ? rounded : 0;
}

export function confirmedCredit(payment: MerchantPayment, document: AccountingDocument) {
  const original = document.Document?.OriginalDocumentID;
  if (
    !payment.ValidPayment ||
    payment.Amount >= 0 ||
    !agorot(payment.Amount) ||
    !positive(original) ||
    !positive(payment.ID) ||
    !positive(payment.CustomerID) ||
    !bookedDocument(payment, document, [6, 7])
  )
    return null;
  return {
    payment_id: payment.ID,
    original_document_id: original,
    customer_id: payment.CustomerID,
    amount_agorot: agorot(payment.Amount),
  };
}

export function confirmedPayment(payment: MerchantPayment, document: AccountingDocument) {
  const items = document.Items ?? [];
  const ids = payment.RecurringCustomerItemIDs ?? [];
  const item = items[0]?.Item?.ID;
  if (
    !positive(payment.ID) ||
    !positive(payment.CustomerID) ||
    !positive(payment.DocumentID) ||
    !positive(item) ||
    items.length !== 1 ||
    Number(items[0].Quantity) !== 1 ||
    !bookedDocument(payment, document, [1, 2]) ||
    !agorot(payment.Amount) ||
    payment.Amount <= 0 ||
    !Number.isFinite(Date.parse(payment.Date)) ||
    ids.length > 1 ||
    (ids.length === 1 && !positive(ids[0]))
  )
    return null;
  return {
    p_payment: payment.ID,
    p_document: payment.DocumentID,
    p_order: uuid.test(payment.ExternalIdentifier ?? '') ? payment.ExternalIdentifier : null,
    p_customer: payment.CustomerID,
    p_recurring: ids[0] ?? null,
    p_item: item,
    p_amount: agorot(payment.Amount),
    p_at: new Date(payment.Date).toISOString(),
    p_accepted: payment.ValidPayment === true,
  };
}
