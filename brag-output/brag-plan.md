# Brag Plan: Sentosa — The Coffee Unit

## What is this app?
SENTOSA — THE COFFEE UNIT is a full-stack, real-world restaurant QR ordering and kitchen operations platform combining tabletop QR resolution, mobile phone OTP authentication, table-specific popular recommendations ("Guests here often order…"), item customization, instant checkout, and live WebSocket kitchen ticket synchronization.

## The angle
Quiet, tactile restaurant craft meets modern tabletop technology. Instead of a generic corporate SaaS dashboard or an airport fast-food kiosk, Sentosa is designed to feel like a high-end specialty coffee house: warm paper textures, hand-drawn editorial illustrations, zero-friction phone verification, and seamless kitchen orchestration.

## Hook (first 2-3 seconds)
A customer camera view / simulated scan reveals Table 05's tabletop QR code. In an instant, the warm, physical Sentosa menu glides open with its signature brand emblem: *"Sentosa — The Coffee Unit • Table 05"*. The editorial section *"Guests here often order…"* softly reveals the table's historical favorites.

## Key moments (the middle)
- **1. Table-Specific Editorial Discovery (0s - 4.5s):** Instant Table 05 QR resolution, auto-hiding header, and table-specific popular items ("Guests here often order… Hot Cappuccino ₹179").
- **2. Tactile Customization Experience (4.5s - 9.0s):** Tapping Hot Cappuccino opens the tactile customization sheet: selecting Creamy Oat Milk (+₹40) and Double Shot (+₹50), updating authoritative pricing to ₹269, and floating down into the minimal cart bar.
- **3. Phone-First Fast Checkout & Waiter Service (9.0s - 13.5s):** No cumbersome emails or passwords. Quick Indian mobile OTP verification (`+91 98765 43210`), instant digital order placement, and dedicated waiter call functionality ("Refill Water").
- **4. Live Kitchen Ticket Synchronization (13.5s - 17.5s):** Instant split cut to the Kitchen / Admin Live Orders Dashboard (`/admin/orders/live`). Order #105 arrives over WebSockets in real time, moves from `CONFIRMED` to `PREPARING` and `READY`, synchronizing customer tracking instantly.

## Outro / punchline
The hand-drawn strolling character pauses with a cup of coffee:
*"Warm, soft & a little unexpected."*
*"Tabletop ordering designed like your café, not an airport kiosk."*

## User flow worth showing
Scan Table 05 QR &rarr; browse table favorites & customize double-shot oat cappuccino &rarr; 6-digit phone OTP checkout &rarr; kitchen screen instantly claims ticket & fires the order.

## Tone
- Preset: `polished`
- Creative direction: "Quiet premium restaurant craft meets modern tabletop technology"
- Interpretation: Smooth, confident pacing with generous letter-spacing, tactile warm backgrounds (`#ebeae7`), crisp editorial cards, and subtle micro-animations.

## Format: landscape — 1920x1080
## Duration: 21.0s

## Visual identity (from the project)
- Background: `#ebeae7` (Warm Paper Tone)
- Accent: `#6492b3` (Sentosa Primary Blue) / `#4f7897` (Deep Blue)
- Text: `#3a3530` (Warm Charcoal)
- Muted: `#8d7d6d` (Taupe)
- Border: `#bdb8ad` (Warm Stone)
- Display font: Plus Jakarta Sans / Inter
- Body font: Plus Jakarta Sans
- Strongest visual elements: Hand-drawn stroll illustration, table favorites editorial card, live order status pills (`CONFIRMED`, `PREPARING`, `READY`).

## Share copy (draft)
We built the complete tabletop ordering and kitchen operations engine for Sentosa — The Coffee Unit. Scan Table 05, customize your brew, and watch the kitchen fire up.

## Audio direction
- Role: Warm coffeehouse bed with understated acoustic rhythm and crisp tactile UI accents.
- Music: `track.mp3` (`happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`), volume 0.32, smooth 1.5s fade-out at the finish.
- Music cue guidance: 120.19 BPM grid. Strong cue locks at 4.5s (customization reveal), 9.0s (order placed), 13.5s (kitchen dashboard arrival), and 17.5s (brand outro).
- Audio-reactive treatment: Subtle ambient warmth and card glow reacting to audio RMS.
- SFX posture: Sparse, motion-matched clicks, soft card drops, and kitchen notification chime.
- Restraint rule: No harsh buzzers, loud sweepers, or generic casino sound effects.

## Storyboard

### Scene 1 — Tabletop QR & Menu Discovery — 4.5s
- **Visual:** Smooth zoom-in on Table 05 tabletop card into the customer mobile menu. The Sentosa emblem and badge "Table 05 • Indiranagar" slide into position. The editorial block reveals: *"Guests here often order… Hot Cappuccino ₹179, Artisan Cold Brew ₹199, Tiramisu Tradizionale ₹279"*.
- **Sequential/interaction:** Three popular items reveal one by one across beats (beat-grid: 1.5s, 2.0s, 2.5s).
- **Audio intent:** Warm invitation into the café environment.
- **Audio-coupled idea:** Soft card arrival sounds (`card.ogg`) on each recommendation.
- **Transition mood:** Clean slide → Scene 2.

### Scene 2 — Craft Customization & Cart — 4.5s
- **Visual:** Focus on "Hot Cappuccino". The customization drawer rises smoothly with options: Milk Option (*Creamy Oat Milk* +₹40) and Espresso Shots (*Double Shot* +₹50). Total updates live: ₹269. Button taps: "Add to Order (₹269)" and drawer glides into the bottom cart bar.
- **Sequential/interaction:** Pill taps toggle to active blue with checkmarks (`select.ogg`), price ticks up to ₹269.
- **Audio intent:** Tactile satisfaction of tailoring a specialty beverage.
- **Audio-coupled idea:** Light UI click on option select, quick confirmation on cart drop.
- **Transition mood:** Smooth crossfade → Scene 3.

### Scene 3 — Mobile Phone OTP & Waiter Assistance — 4.5s
- **Visual:** Instant 2-step phone authentication: Phone number `+91 98765 43210` enters, 6-digit OTP `339 311` auto-fills and verifies with a green check. Order #105 confirmed. Beside it, the "Call Waiter" module is tapped for "Refill Water".
- **Sequential/interaction:** OTP digits populate, status badge morphs into "Order #105 Confirmed • Sent to Kitchen".
- **Audio intent:** Speed and modern simplicity without cumbersome password forms.
- **Audio-coupled idea:** Gentle success chime (`chime.ogg`).
- **Transition mood:** Wipe/cut → Scene 4.

### Scene 4 — Live Kitchen Synchronization — 4.0s
- **Visual:** The perspective switches to the Kitchen Display System (`/admin/orders/live`). Ticket #105 arrives with audio alert: "Table 05 • Hot Cappuccino (Oat Milk, 2 Shots)". Kitchen staff moves status pill from `CONFIRMED` &rarr; `PREPARING` &rarr; `READY`. Simultaneous customer tracking status reflects the live updates.
- **Sequential/interaction:** Status pill transitions smoothly from amber to sky blue to emerald.
- **Audio intent:** Operational confidence and real-world kitchen velocity.
- **Audio-coupled idea:** Kitchen order bell / tactile button click.
- **Transition mood:** Elegant slow fade → Scene 5.

### Scene 5 — Editorial Outro & Brand Identity — 3.5s
- **Visual:** Full-frame Sentosa brand canvas with hand-drawn coffee stroll illustration.
- **Typography:**
  - *"Sentosa — The Coffee Unit"*
  - *"Warm, soft & a little unexpected."*
  - Subline: *"Tabletop ordering designed like your café, not an airport kiosk."*
- **Audio intent:** Relaxed resolution; music gently fades out into warmth.
- **Audio summary:** A warm, rhythmic coffeehouse acoustic bed carrying the viewer from table QR scan to kitchen ticket fulfillment, finishing on an elegant brand seal.
