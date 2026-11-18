# Teacher subscriptions and notices in Israel

The 14-day teacher trial needs no card and becomes Free at expiry. A free teacher can keep one class with up to 30 pupils. A school license covers its teachers.

| Individual teacher Pro | Price per student | 30 students | 60 students |
| --- | --- | --- | --- |
| Monthly | ₪0.50 a month | ₪15 | ₪30 |
| Annual | ₪2 a year, capped at ₪69 for the teacher | ₪60 | ₪69 |

The quote counts each approved account once across all active classes the teacher owns, including accounts that have never signed in. Pending requests and archived classes are excluded. A quote is available during the trial and checkout opens after it. Each purchase is one payment for the selected term. Changes to the roster are reflected when the teacher next purchases a term. For a teacher with 30 students, the annual term saves ₪120 compared with 12 monthly payments.

## What gets delivered

| Event | Audience and channel | Trigger |
| --- | --- | --- |
| New assignment, reward, live challenge | Students, optional device push | The existing push feature, delivery caps and quiet hours are described in [the push runbook](./PUSH-NOTIFICATIONS-RUNBOOK.md). |
| Announcement | Students or teachers, in-app banner | An admin chooses its audience, start and end. |
| Teacher news by email | Verified teacher email with active consent | Publish an announcement with the teachers audience. The hourly job picks it up within two days of publication. |
| Trial ending | Teacher dashboard and optional teacher email | During the last three days of a 14-day trial. |
| Trial ended | Teacher dashboard and optional teacher email | In the first two days after expiry. |
| Payment and receipt | Paying teacher | Verify the payment with SUMIT, grant the paid term and have SUMIT deliver the receipt. |
| Standing order cancellation | Teacher with an existing standing order | Stop renewal and retain the paid period. A pending request stays visible until confirmed. |

Enrollment and payment are independent. Students can join a named class by QR, link or class code. There is no student checkout or marketing-email collection in the subscription flow.

## Configure a test merchant

1. Create two distinct ILS catalog items for the monthly and annual terms, and configure the merchant to issue a finalized receipt or tax-invoice receipt after capture. The server sends the total as the unit price for one item and requests a one-hour checkout link. Verify that the merchant displays the same gross amount and can accept the smallest eligible amounts.
2. Apply the SQL migration to an isolated staging database and deploy the staging API and frontend. Set `SUMIT_COMPANY_ID`, `SUMIT_API_KEY`, `SUMIT_MONTHLY_ITEM_ID`, `SUMIT_ANNUAL_ITEM_ID` and `VOCABAND_LIFECYCLE_TOKEN` on the server. Configure the scheduler with the same job token. Set `VOCABAND_BILLING_ORIGIN` to the HTTPS staging origin. It defaults to `https://vocaband.com`. The repository's hourly workflow targets the production domain.
3. Enable checkout on staging with `VOCABAND_CHECKOUT_ENABLED=true`. The server creates a one-time order via SUMIT's [hosted payment API](https://help.sumit.co.il/he/articles/15316096). The return and the hourly job both verify completed payments server-to-server. The card entry stays on SUMIT's payment page.

## Configure teacher mail

Set `RESEND_API_KEY`, `VOCABAND_MAIL_FROM` (a verified sending identity), `VOCABAND_MAIL_BUSINESS_IDENTITY` (the legal business name, postal and contact details) and `VOCABAND_TEACHER_EMAIL_ENABLED=true` on the API. Mail settings operate independently of checkout. Teachers select their language and actively enable news, offers and trial reminders in the subscription dialog. An unchecked box, a school entitlement on a trial reminder, an unverified address or a student account excludes that recipient. Each message includes a one-click unsubscribe endpoint and a visible unsubscribe link. Complete the service and privacy disclosures for SUMIT and teacher campaign mail before enabling them for users.

## Merchant acceptance before enabling live sales

Use the processor's test mode and test identities. Verify monthly and annual payments at ₪0.50 and ₪2, and the annual cap at 35 or more students. Check an abandoned checkout, an expired or resumed link, a duplicate payment, a declined payment, full and partial refunds, and reconciliation without a browser return. Compare the provider's payment and document IDs, catalog item, gross ILS amount and customer to the stored order. Confirm that checkout opens no standing order and the return shows the paid term in the teacher dashboard.

The `teacher_billing_review` table lists payments that need investigation without keeping the cardholder's details. A confirmed first period with a missing standing-order ID is granted and flagged. Validate the standing order against the actual merchant record before linking it. Inspect pending cancellations with a missing schedule promptly. Credits reduce access only when a verified credit receipt identifies the original receipt and payer and the total credited covers the original charge. Reconcile unlinked credits, disputes and chargebacks reported separately by the acquirer against the original merchant receipt. Disabling checkout stops new sales. Keep the API, job, credentials and cancellation access running for existing subscribers.

The scheduler reconciles bounded, overlapping time windows and only advances its cursor after a full successful window. Payment IDs and original document IDs guard against duplicate access. Mail deliveries use stable provider idempotency keys and a short lease. Monitor failed workflow runs, rows in `teacher_billing_review`, unresolved cancellation requests, old reconciliation cursors and unsent mail that has exhausted its retry window. The [Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys) explains the provider's retention window.
