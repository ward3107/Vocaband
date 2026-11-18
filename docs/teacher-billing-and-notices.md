# Teacher subscriptions and notices in Israel

The [pricing model](./PRICING-MODEL.md) lists the personal monthly and annual plans, Pro capacity additions and the annual school license. Approved students count towards capacity. A school coordinator can buy a six-week pilot and redeem its payment once against the first annual purchase. Each purchase covers one term.

## What gets delivered

| Event | Audience and channel | Trigger |
| --- | --- | --- |
| New assignment, reward, live challenge | Students, optional device push | The existing push feature, delivery caps and quiet hours are described in [the push runbook](./PUSH-NOTIFICATIONS-RUNBOOK.md). |
| Announcement | Students or teachers, in-app banner | An admin chooses its audience, start and end. |
| Teacher news by email | Verified teacher email with active consent | Publish an announcement with the teachers audience. The hourly job picks it up within two days of publication. |
| Trial ending | Teacher dashboard and optional teacher email | During the last three days of a 14-day trial. |
| Trial ended | Teacher dashboard and optional teacher email | In the first two days after expiry. |
| Payment and receipt | Paying teacher or school coordinator | Verify the payment with SUMIT, grant the paid term and have SUMIT deliver the receipt. |
| Standing order cancellation | Teacher with an existing standing order | Stop renewal and retain the paid period. A pending request stays visible until confirmed. |

Enrollment and payment are independent. Students can join a named class by QR, link or class code. There is no student checkout or marketing-email collection in the subscription flow.

## Configure a test merchant

1. Create three one-time ILS catalog items for personal monthly, personal annual, and school purchases. Configure the merchant to issue a finalized receipt or tax-invoice receipt after capture. The server sends the exact amount due as the unit price for one item and requests a one-hour checkout link. Verify the gross amount and the smallest eligible prorated charge.
2. Apply the billing, subscription plans and school workspace migrations to an isolated staging database before deploying the staging API and frontend. Set `SUMIT_COMPANY_ID`, `SUMIT_API_KEY`, `SUMIT_MONTHLY_ITEM_ID`, `SUMIT_ANNUAL_ITEM_ID`, `SUMIT_SCHOOL_ITEM_ID` and `VOCABAND_LIFECYCLE_TOKEN` on the server. Configure the scheduler with the same job token. Set `VOCABAND_BILLING_ORIGIN` to the HTTPS staging origin. It defaults to `https://vocaband.com`. The repository's hourly workflow targets the production domain.
3. Enable checkout on staging with `VOCABAND_CHECKOUT_ENABLED=true`. The server creates a one-time order via SUMIT's [hosted payment API](https://help.sumit.co.il/he/articles/15316096). The return and the hourly job both verify completed payments server-to-server. The card entry stays on SUMIT's payment page.

## Configure teacher mail

Set `RESEND_API_KEY`, `VOCABAND_MAIL_FROM` (a verified sending identity), `VOCABAND_MAIL_BUSINESS_IDENTITY` (the legal business name, postal and contact details) and `VOCABAND_TEACHER_EMAIL_ENABLED=true` on the API. Mail settings operate independently of checkout. Teachers select their language and actively enable news, offers and trial reminders in the subscription dialog. An unchecked box, a school entitlement on a trial reminder, an unverified address or a student account excludes that recipient. Each message includes a one-click unsubscribe endpoint and a visible unsubscribe link. Complete the service and privacy disclosures for SUMIT and teacher campaign mail before enabling them for users.

## Merchant acceptance before enabling live sales

Use the processor's test mode and test identities. Verify personal payments at ₪12, ₪99, ₪19 and ₪169, a Pro term with extra seats, and a prorated expansion that keeps the original expiry. Verify both standalone school annual and pilot purchases at ₪2,490 and ₪590. Check that the first annual purchase after a pilot costs ₪1,900 and that subsequent annual terms cost ₪2,490. Confirm that only the coordinator can purchase a school term. Check the full onboarding flow through the school inquiry and membership screens. Check an abandoned checkout, an expired or resumed link, a duplicate payment, a declined payment, full and partial refunds, and reconciliation without a browser return. Compare the provider's payment and document IDs, catalog item, gross ILS amount and customer to the stored order. Confirm that checkout opens no standing order and the return shows the paid term in the teacher dashboard.

The `teacher_billing_review` table lists payments that need investigation without keeping the cardholder's details. A confirmed legacy recurring period with a missing standing-order ID is granted and flagged. Validate the standing order against the actual merchant record before linking it. Inspect pending cancellations with a missing schedule promptly. Credits reduce access only when a verified credit receipt identifies the original receipt and payer and the total credited covers the original charge. Reconcile unlinked credits, disputes and chargebacks reported separately by the acquirer against the original merchant receipt. Disabling checkout stops new sales. Keep the API, job, credentials and cancellation access running for existing subscribers.

The scheduler reconciles bounded, overlapping time windows and only advances its cursor after a full successful window. Payment IDs and original document IDs guard against duplicate access. Mail deliveries use stable provider idempotency keys and a short lease. Monitor failed workflow runs, rows in `teacher_billing_review`, unresolved cancellation requests, old reconciliation cursors and unsent mail that has exhausted its retry window. The [Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys) explains the provider's retention window.
