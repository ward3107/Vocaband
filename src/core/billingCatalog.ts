export const PERSONAL_BILLING = {
  teacher: { monthly: 1200, annual: 9900, seats: 60 },
  pro: { monthly: 1900, annual: 16900, seats: 150 },
  proExtension: { monthly: 600, annual: 4900, seats: 50 },
} as const;
export const SCHOOL_BILLING = {
  annual: 249000, pilot: 59000, seats: 400, staff: 6, pilotStaff: 2, pilotWeeks: 6,
} as const;
export const FREE_OPEN_ASSIGNMENTS = 3;
export const MONTHLY_WORK_QUOTA = 30;
export const OFFER_IDS = [
  'teacher_monthly', 'teacher_annual', 'pro_monthly', 'pro_annual',
  'school_pilot', 'school_annual',
] as const;

export type OfferId = typeof OFFER_IDS[number];
export type BillingEntitlement = {
  tier: 'free' | 'teacher' | 'pro' | 'school' | 'trial';
  until?: string | null;
  capacity?: number | null;
  months?: number;
};
export type BillingOffer = {
  code: OfferId;
  tier: 'teacher' | 'pro' | 'school';
  months: 1 | 12;
  seatLimit: number;
  staffLimit: number | null;
  amount: number;
  fullAmount: number;
  available: boolean;
  upgrade: boolean;
  credit: number;
};
export type BillingQuote = {
  students: number;
  staff: number | null;
  blocks: number;
  schoolId: string | null;
  schoolName: string | null;
  covered: boolean;
  until: string | null;
  capacity: number | null;
  offers: BillingOffer[];
  trialEndsAt: string | null;
  entitlement: BillingEntitlement;
};
