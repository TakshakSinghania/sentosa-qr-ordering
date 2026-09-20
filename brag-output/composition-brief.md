# Hyperframes Composition Brief: Sentosa — The Coffee Unit

## Objective
Create a short, polished, shareable launch video for **Sentosa — The Coffee Unit's** mobile tabletop QR ordering and live restaurant operations platform.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21.0 seconds
- FPS: 30

## Source Material
- Project root: `/Users/takshak/projects/qr`
- Primary files read:
  - `client/src/pages/customer/CustomerMenuPage.tsx`
  - `client/src/components/customer/TableFavoritesSection.tsx`
  - `client/src/components/customer/ItemDetailModal.tsx`
  - `client/src/components/customer/MenuHeader.tsx`
  - `client/src/pages/admin/AdminOrdersPage.tsx`
- Product name: Sentosa — The Coffee Unit
- Tagline: *"Warm, soft & a little unexpected."*
- Key UI moments:
  - Tabletop QR code resolving Table 05
  - Customer menu header & "Guests here often order…" recommendations
  - Item customization sheet (Hot Cappuccino with Oat Milk & Double Shot)
  - Seamless 6-digit phone OTP verification & order placement
  - Kitchen Display System (`/admin/orders/live`) ticket transitions
  - Waiter assistance call module
- Copy that must appear verbatim:
  - *"Sentosa — The Coffee Unit"*
  - *"Guests here often order…"*
  - *"Table 05 • Indiranagar"*
  - *"Warm, soft & a little unexpected."*
  - *"Tabletop ordering designed like your café, not an airport kiosk."*

## Creative Direction
- Tone preset: `polished`
- Creative direction: "Quiet premium restaurant craft meets modern tabletop technology"
- Interpretation: Serious, tactile, and elegant. Generous spacing, warm paper tone, no flashy cartoon transitions or generic SaaS tech buzzwords.
- Hook: Customer scans Table 05 QR, revealing the warm tactile menu and table-specific recommendations.
- Outro / punchline: *"Warm, soft & a little unexpected."* / *"Tabletop ordering designed like your café, not an airport kiosk."*
- Avoid:
  - Generic SaaS phrases ("streamline your workflow", "all-in-one AI solution")
  - Abstract filler shapes
  - Overly busy or rapid text flashing

## Visual Identity
- Background: `#ebeae7` (Warm Paper Canvas)
- Primary Blue: `#6492b3` (Sentosa Blue)
- Deep Blue: `#4f7897`
- Warm Charcoal: `#3a3530`
- Taupe: `#8d7d6d`
- Stone Border: `#bdb8ad`
- Light Card Fill: `#ffffff` with subtle `#bdb8ad`/60 borders
- Status Emerald: `#10b981` (Ready / Verified)
- Status Amber: `#f59e0b` (Preparing)
- Display font: Plus Jakarta Sans / system-ui, sans-serif
- Body font: Plus Jakarta Sans / system-ui, sans-serif
- Visual references: Hand-drawn stroll illustration (`assets/brand/illustration-stroll-transparent.png`), Table 05 indicator badge, Veg dietary badges, live order status pills.

## Storyboard
Duration: 21.0s total.

1. **Scene 1: Tabletop QR & Menu Discovery (0.0s – 4.5s)**
   - Table 05 tabletop card zooms smoothly into the phone menu.
   - Header reveals brand logo & Table 05 badge.
   - Editorial card "Guests here often order…" reveals Hot Cappuccino (₹179), Artisan Cold Brew (₹199), and Tiramisu (₹279).

2. **Scene 2: Craft Customization (4.5s – 9.0s)**
   - "Hot Cappuccino" card expands into the bespoke customization drawer.
   - Options selected: Creamy Oat Milk (+₹40) and Double Shot (+₹50).
   - Authoritative total updates to ₹269.
   - Tapped into bottom cart drawer.

3. **Scene 3: Phone OTP & Order Confirmation (9.0s – 13.5s)**
   - Customer enters mobile number `+91 98765 43210`.
   - 6-digit OTP auto-fills: `339 311` &rarr; Instant verified badge.
   - Order #105 confirmed. Waiter assistance option shown.

4. **Scene 4: Kitchen Operations Synchronization (13.5s – 17.5s)**
   - Split view shifts to the live Kitchen Display System (`/admin/orders/live`).
   - Ticket #105 arrives over WebSockets for Table 05.
   - Status advances `CONFIRMED` &rarr; `PREPARING` &rarr; `READY`.

5. **Scene 5: Brand Seal & Outro (17.5s – 21.0s)**
   - Hand-drawn Sentosa coffee stroll illustration with brand signature.
   - Tagline: *"Warm, soft & a little unexpected."*
   - Punchline: *"Tabletop ordering designed like your café, not an airport kiosk."*

## Audio
- Audio role: Warm acoustic/lo-fi coffeehouse beat providing rhythmic elegance and tactile confidence.
- Music: `assets/music/track.mp3` (`happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`), volume 0.32 with a 1.5s fade-out at the end.
- SFX:
  - `assets/sfx/card.ogg` on table favorites card reveal
  - `assets/sfx/select.ogg` on coffee customization toggle
  - `assets/sfx/click.ogg` on Add to Order tap
  - `assets/sfx/chime.ogg` on order verification and kitchen ticket arrival
- Restraint rule: Audio should feel like natural physical presence, never overpowering or loud.
