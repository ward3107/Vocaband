# Teacher subscriptions and notices in Israel

The default 14-day teacher trial needs no card and becomes Free at expiry. A free teacher can keep one class with up to 30 pupils. A school license covers its teachers. The catalog below is a proposed first price test. All amounts are the total shown to the teacher in shekels.

| Offer | Suggested price | Renewal |
| --- | --- | --- |
| Individual Pro | ₪29 per month | Monthly until canceled |
| Individual Pro annual | ₪290 per year | Yearly until canceled |
| Launch offer | ₪249 for 12 months | One payment with a published closing date |
| Student | Free | None |

Annual Pro saves ₪58 against twelve monthly payments. Compare the percentage of trial teachers who create a class, invite a student, complete their first activity and choose a paid subscription. Compare annual uptake and contribution after clearing fees and AI/OCR usage before making a launch discount permanent.

## What gets delivered

| Event | Audience and channel | Trigger |
| --- | --- | --- |
| New assignment, reward, live challenge | Students, optional device push | The existing push feature, delivery caps and quiet hours are described in [the push runbook](./PUSH-NOTIFICATIONS-RUNBOOK.md). |
| Announcement | Students or teachers, in-app banner | An admin chooses its audience, start and end. |
| Teacher news by email | Verified teacher email with active consent | Publish an announcement with the teachers audience. The hourly job picks it up within two days of publication. |
| Trial ending | Teacher dashboard and optional teacher email | During the last three days of a 14-day trial. |
| Trial ended | Teacher dashboard and optional teacher email | In the first two days after expiry. |
| First charge, renewal and receipt | Paying teacher | Confirm the payment server-to-server, grant the paid period and configure SUMIT to deliver the receipt. |
| Cancellation | Paying teacher, subscription dialog | Stop the standing order and retain the paid period. A pending request stays visible until confirmed. |

Enrollment and payment are independent. Students can join a named class by QR, link or class code. There is no student checkout or marketing-email collection in the subscription flow.

## Configure a test merchant

1. Create fixed-price ILS catalog items and separate hosted checkout pages in the merchant account for the chosen offers. Set quantity to one, VAT treatment to match the displayed total, monthly or twelve-month recurrence on the two renewal pages, and a single payment and end date on the promotional page. Configure credit-card payment, actual capture, automatic receipt delivery, and a finalized receipt or tax-invoice receipt. Display the renewal amount, cadence, merchant contact and cancellation terms. The merchant should disable price or quantity overrides. Use a dedicated Vocaband merchant or dedicated catalog products for reliable reconciliation.
2. Configure the post-payment redirect to `https://vocaband.com/?billing=1`. The server creates the order and passes its UUID as `externalidentifier`. A signed-in teacher's return and an hourly payment listing both use bookings fetched from the merchant. A card number never passes through Vocaband. SUMIT documents its [redirect fields and their limitations](https://help.sumit.co.il/he/articles/5836159) and [API](https://developers.sumit.co.il/).
3. Apply the SQL migration to an isolated staging database, then deploy the staging API and frontend. In the Fly secret store set `SUMIT_COMPANY_ID`, `SUMIT_API_KEY`, `VOCABAND_BILLING_OFFERS`, and `VOCABAND_LIFECYCLE_TOKEN`. Give the corresponding scheduler the same job token. Keep credentials server-side. Use a staging-specific scheduler URL when running a staging build. The repository's hourly workflow targets the production domain. Checkout also requires `VOCABAND_CHECKOUT_ENABLED=true`.
4. Set the catalog JSON below using the account's actual numeric item IDs and hosted page URLs. The example values are placeholders. Set an actual campaign closing timestamp and enforce it on the hosted catalog page too. The displayed price and the merchant's gross charge must agree exactly.

```json
[
  {"code":"monthly","months":1,"agorot":2900,"recurring":true,"itemId":101,"page":"https://pay.sumit.co.il/replace-monthly","endsAt":null},
  {"code":"annual","months":12,"agorot":29000,"recurring":true,"itemId":102,"page":"https://pay.sumit.co.il/replace-annual","endsAt":null},
  {"code":"launch","months":12,"agorot":24900,"recurring":false,"itemId":103,"page":"https://pay.sumit.co.il/replace-launch","endsAt":"2026-12-31T21:59:59Z"}
]
```

## Configure teacher mail

Set `RESEND_API_KEY`, `VOCABAND_MAIL_FROM` (a verified sending identity), `VOCABAND_MAIL_BUSINESS_IDENTITY` (the legal business name, postal and contact details) and `VOCABAND_TEACHER_EMAIL_ENABLED=true` on the API. Mail settings operate independently of checkout. Teachers select their language and actively enable news, offers and trial reminders in the subscription dialog. An unchecked box, a school entitlement on a trial reminder, an unverified address or a student account excludes that recipient. Each message includes a one-click unsubscribe endpoint and a visible unsubscribe link. Complete the service and privacy disclosures for SUMIT and teacher campaign mail before enabling them for users.

## Merchant acceptance before enabling live sales

Use the processor's test mode and test identities. Verify a first payment, a renewal without a browser redirect, a missed or repeated reconciliation, client cancellation with a transient network error, a declined renewal, a full and partial refund, both sides of the campaign cutoff, and a duplicate checkout. Compare the real provider's payment ID, document type and ID, catalog item, gross ILS amount, customer and standing-order ID to the stored order. Confirm that the return opens the teacher dashboard in a fresh tab. For a prepaid promotion verify that no standing order is created.

The `teacher_billing_review` table lists payments that need investigation without keeping the cardholder's details. A confirmed first period with a missing standing-order ID is granted and flagged. Validate the standing order against the actual merchant record before linking it. Inspect pending cancellations with a missing schedule promptly. Credits reduce access only when a verified credit receipt identifies the original receipt and payer and the total credited covers the original charge. Reconcile unlinked credits, disputes and chargebacks reported separately by the acquirer against the original merchant receipt. Disabling checkout stops new sales. Keep the API, job, credentials and cancellation access running for existing subscribers.

The scheduler reconciles bounded, overlapping time windows and only advances its cursor after a full successful window. Payment IDs and original document IDs guard against duplicate access. Mail deliveries use stable provider idempotency keys and a short lease. Monitor failed workflow runs, rows in `teacher_billing_review`, unresolved cancellation requests, old reconciliation cursors and unsent mail that has exhausted its retry window. The [Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys) explains the provider's retention window.
