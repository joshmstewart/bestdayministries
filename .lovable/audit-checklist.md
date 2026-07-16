# Platform Audit Checklist

Legend: `[ ]` untested · `[testing]` in progress · `[pass]` verified · `[fail:reason]` broken · `[fixed:desc]` broken then fixed · `[blocked:reason]` cannot test in sandbox

## Auth & Terms
- [ ] auth signup + terms recording
- [ ] terms acceptance recording (record-acceptance edge fn)
- [ ] role gating: supporter
- [ ] role gating: bestie
- [ ] role gating: caregiver
- [ ] role gating: moderator
- [ ] role gating: admin
- [ ] role gating: owner

## Donations
- [ ] donation one-time (test mode)
- [ ] donation monthly (test mode)
- [ ] donation reconciliation cron (reconcile-donations-from-stripe)

## Sponsorships
- [ ] sponsorship checkout (test mode)
- [ ] sponsorship webhook (stripe-webhook)
- [ ] sponsorship receipt email (Resend + email_send_log)
- [ ] guest sponsorship linking (link_guest_sponsorships trigger)
- [ ] sponsorship reconciliation cron

## Marketplace
- [ ] marketplace checkout — handmade
- [ ] marketplace checkout — Printify
- [ ] vendor payout transfer (create-vendor-transfer)
- [ ] Stripe Connect onboarding
- [ ] ShipStation sync
- [ ] AfterShip tracking
- [ ] Shopify cart
- [ ] vendor payout cron

## Messaging & Contact
- [ ] contact form submit
- [ ] contact form inbound reply (Cloudflare → process-inbound-email)

## Guardian Approvals
- [ ] guardian approval — post
- [ ] guardian approval — comment
- [ ] guardian approval — message
- [ ] guardian approval — vendor asset

## Bestie Linking
- [ ] bestie linking 3-emoji flow
- [ ] vendor bestie request
- [ ] sponsor messaging

## Notifications & Email
- [ ] notification digest daily (send-digest)
- [ ] notification digest weekly
- [ ] newsletter send (send-newsletter)
- [ ] newsletter automated trigger (send-automated-campaign)
- [ ] email queue processor (process-email-queue)
- [ ] Resend delivery via email_send_log

## Security & Infra
- [ ] Stripe webhook signature verification
- [ ] RLS on every user-facing table (linter pass)
- [ ] edge function CORS on every function

## Games & Features
- [ ] coin deduction via deductCoins hook
- [ ] sticker pack opening
- [ ] daily fortune release MST
- [ ] wordle daily
- [ ] mood tracker
- [ ] recipe generation
- [ ] TTS

## Route Loading
- [ ] all public routes load
- [ ] all authenticated routes load per role
- [ ] all admin tabs load

---

## Evidence Log

_(entries appended per turn)_
