# Recent Work Summary

This document summarizes recent implementation and operational work completed on SwiftVote.

## Nomination Form Validation

- Added client-side validation requiring phone numbers on the nomination form to be exactly 10 digits.
- Updated the phone placeholders to match the expected Ghana-style format, for example `0257323294`.
- Added backend DTO validation for nomination phone numbers so invalid submissions cannot bypass the frontend.
- The affected nomination fields are:
  - nominator phone number
  - nominee phone number

## Nominee Confirmation Email Flow

- Kept nominee email as the requirement for confirming a nomination because contestant login credentials are sent by email.
- Added a simple inline email input on pending nomination cards when a nominee has no email on record.
- When an event manager enters an email and confirms the nominee:
  - the email is sent with the confirmation request
  - the backend validates the email
  - the nomination is updated with the email
  - the contestant is created with that email
  - contestant account provisioning runs so login details can be emailed
- Existing nominations that already have nominee email continue to confirm without extra input.

## Contestant Seeding

- Seeded contestants for the local event `Amalitech Voting`.
- Target event:
  - event id: `cmorgv2ue0007fw2b5zq7pvhx`
  - category: `Best Female Category`
- Created five confirmed nominations and matching contestant records:
  - `AV-0001` Akosua Mensah
  - `AV-0002` Abena Owusu
  - `AV-0003` Esi Boateng
  - `AV-0004` Ama Serwaa
  - `AV-0005` Nana Yaa Asante
- Verified that the event has five contestants and five confirmed nominations.

## Paystack Callback And Confirmation Flow

- Confirmed that `/vote/callback` already exists in the frontend and is the intended Paystack return page.
- The callback page:
  - reads `eventId`
  - reads `reference` or `trxref`
  - calls the backend vote verification endpoint
  - polls briefly while Paystack is still pending
  - shows confirmed, failed, pending, or error states
- Fixed the receipt display so long payment references wrap cleanly instead of touching the `Reference` label.
- Added a safer callback-origin flow:
  - frontend vote submission now sends `window.location.origin`
  - backend uses that origin to build the Paystack callback URL
  - backend still falls back to `FRONTEND_ORIGIN` if no callback origin is provided
- This avoids sending voters back to the wrong local frontend port when development ports differ.

## Current Payment Logic Review

The paid vote flow currently works as follows:

1. Frontend submits vote details.
2. Backend validates event, contestant, category, and quantity.
3. Backend initializes a Paystack transaction with amount, currency, reference, callback URL, and metadata.
4. Backend creates a local `PENDING_PAYMENT` vote using the Paystack reference.
5. User pays on Paystack.
6. Paystack redirects to `/vote/callback`.
7. Frontend calls backend verification.
8. Backend verifies the reference with Paystack.
9. Successful payments become `CONFIRMED`; failed or abandoned payments become `FAILED`.
10. Vote counts include only `FREE` and `CONFIRMED` votes.

Webhook handling also exists:

- `charge.success` calls the same confirmation use case.
- `charge.failed` marks the vote failed.
- Webhook signatures are verified before processing.

## Payment Hardening Recommendation

The overall payment flow is structurally valid because votes are only counted after backend verification with Paystack.

One hardening item remains:

- Before marking a paid vote `CONFIRMED`, compare Paystack verification data against the local pending vote:
  - Paystack `reference` must match local `transactionRef`
  - Paystack `amount` must match local `amountMinor`
  - Paystack `currency` must match local `currency`

This would make confirmation stricter and better aligned with production payment safety expectations.
