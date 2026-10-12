# REALWORLD Layer 5.0 — Procurement Planning & Delivery Transparency

Build ID: `RW-LAYER-5.0 · Procurement Planning & Delivery Transparency · 2026-10-12`

## Goal

Layer 5 adds a transparent, decision-support view for replenishing inventory without changing the accounting engine or save envelope. It responds to the Layer 4 live QA observation that a one-week standard-supplier order took three week-closes to arrive. The deployed model allows a delivery reliability event to extend an ETA; the improved UI shows the original ETA, current ETA, delay count, and supplier's modeled on-time reliability.

## Changes

- Adds a deterministic estimated-weekly-demand helper using current price, simulated economy, reputation, marketing, customer mix, seasonality, and rival availability.
- Adds a Stock Cover & Reorder Planner for stocked-goods offers.
- Shows estimated weeks of cover based on stock plus open purchase orders.
- Offers suggested quantities for each supplier based on modeled lead time plus one safety week. Open purchase orders due by the supplier's proposed ETA are credited against that supplier's suggestion.
- The `Use` action only prefills the supplier and quantity controls. It never places an order automatically. The user must review and press the existing Place Purchase Order button.
- The purchase-order register distinguishes placed week, original ETA, current ETA, and modeled delay count.
- Preserves supplier advance/payable accounting, stock capitalization at receipt, save format v8, migration handlers, country registry, readiness task state, loans, and all existing operating engines.

## Planning limits

Reorder quantities are simulation estimates, not guaranteed sales forecasts. They intentionally omit random events and capacity constraints. Supplier lead times, quoted price factors, and on-time reliability are gameplay assumptions, not real supplier offers. An open order is counted for total cover; supplier-specific suggestions only credit open orders expected by that proposed ETA. Each suggested order is capped at 2,000 units; a trailing `+` indicates that more than one order may be required.

This layer does not change tax calculations, country law behavior, cash accounting, or save format. Save format remains v8.

## Validation

Local test suite: 100 tests, 100 passed, 0 failed. Tests include deterministic demand planning, supplier lead-time comparison, open-order credit, safe prefill behavior, delay disclosure in the PO register, the complete v8 import/migration suite, accounting reconciliation, multi-loan behavior, and insolvency closure regression.

Run with Node.js:

```bash
node --test regression.test.cjs
```

Live acceptance is still required after deployment. Local tests do not prove that a real browser session can execute every UI flow.
