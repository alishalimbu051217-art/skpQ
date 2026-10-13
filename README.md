# SkpQ — interconnected app (VS Code build)

## What's in here

```
skpq-app/
├── index.html                 Role selection (Customer / Employee)
├── login.html                 Customer login — Google Sign-In (Firebase Auth)
├── dashboard.html             Customer home — Welcome, Scan Item CTA, cart preview
├── scan.html                  Barcode scanning (Quagga2) + running cart drawer
├── cart.html                  Cart summary → "Generate Token/QR Code"
├── token.html                 Shows QR + token, waits for employee verification
├── verified.html              "Verified!" screen → auto-redirects to payment
├── payment.html                Order summary + Pay Now
├── profile.html                Profile, dark/light toggle, logout
├── employee-login.html         Staff login — company email + password (Firebase Auth)
├── employee-dashboard.html     QR scanner (html5-qrcode) + manual token entry
├── order-verification.html     Item checklist, weight entry, Verified/Reject
├── js/
│   ├── firebase-config.js      ⚠️ put your real Firebase config here
│   └── cart.js                 Shared cart (localStorage) + theme helpers
└── firestore.rules             Starter security rules for the "sessions" collection
```

## How the pieces connect

1. **index.html** → tapping *Customer* goes to `login.html`, *Employee* goes to `employee-login.html`.
2. **Customer flow**: `login.html` (Google) → `dashboard.html` → `scan.html` (adds items to
   a `localStorage` cart) → `cart.html` → tapping **Generate Token/QR Code** writes a new
   document to Firestore at `sessions/{token}` with the cart items and `status: "pending"`,
   then opens `token.html?token=XXXXXX`.
3. **token.html** renders the QR (encodes the token) and opens a **real-time Firestore
   listener** on that session document. It just sits there until the status changes.
4. **Employee flow**: `employee-login.html` (email/password) → `employee-dashboard.html`,
   where the associate either scans the customer's QR (camera) or types the token
   manually → `order-verification.html?token=XXXXXX`, which loads the same Firestore
   document and lists the items.
5. Tapping **Verified** updates `sessions/{token}.status` to `"verified"`. Firestore pushes
   that change to the customer's still-open `token.html` tab instantly — no polling — which
   redirects them to `verified.html` → `payment.html`.
6. **payment.html**'s Pay Now button marks the session `"paid"` and clears the local cart.

This is the mechanism that satisfies "the employee interface should send a signal to the
user interface" — Firestore's `onSnapshot` listener *is* that signal, so no custom backend
server is needed.

## Setup steps

### 1. Create a Firebase project
1. Go to https://console.firebase.google.com → **Add project**.
2. Once created, go to **Build → Authentication → Sign-in method** and enable:
   - **Google** (for customers)
   - **Email/Password** (for employees)
3. Go to **Build → Firestore Database → Create database** (start in test mode for
   development — lock it down with `firestore.rules` before you submit/deploy).
4. Go to **Project settings → General → Your apps → Add app → Web (</>)** and copy the
   `firebaseConfig` object it gives you.

### 2. Plug in your config
Open `js/firebase-config.js` and replace the placeholder values with the real ones from
step 1.

### 3. Create your employee account(s)
Firebase Auth doesn't let you "hardcode" a password in client code (that would be visible
to anyone who views source). Instead, create the shared employee account once:
- **Authentication → Users → Add user** → e.g. `staff@skpq.com` / a password you choose.
- Give that same email/password to whoever staffs the checkout counter.
- If you want *multiple* distinct employees, just add more users the same way.

### 4. Run it locally in VS Code
Plain HTML/JS like this needs to be served over `http(s)://`, not opened as a `file://`
path, or the camera (Quagga2/html5-qrcode) and Firebase Auth popups will misbehave.

- Install the **Live Server** extension in VS Code.
- Right-click `index.html` → **Open with Live Server**.
- It'll open at something like `http://127.0.0.1:5500/index.html`.

### 5. Add your Firebase domain to authorized domains
**Authentication → Settings → Authorized domains** → add `127.0.0.1` / `localhost` (usually
already there) so Google Sign-In popups work locally.

### 6. Deploy (optional, for your report/demo)
Netlify (matches your existing deployment) works as-is — drag-and-drop the `skpq-app`
folder in the Netlify dashboard, or connect it to a GitHub repo. Then add the Netlify URL
to **Authorized domains** in Firebase too.

## Known simplifications (worth mentioning in your project report)

- **Product catalog**: `scan.html` uses a small hardcoded `PRODUCT_DB` object mapping
  barcode → {name, price}. In a real deployment this would be a Firestore `products`
  collection (or a lookup API) keyed by barcode.
- **Employee role check**: currently any authenticated Firebase user who signs in through
  `employee-login.html` gets a `sessionStorage` flag treating them as staff. For a real
  deployment, use **Firebase custom claims** (set via the Admin SDK / a Cloud Function) so
  the Firestore rules can verify `request.auth.token.employee == true` server-side, rather
  than trusting a client-side flag.
- **Security rules**: `firestore.rules` is a starting point — it currently lets any signed-in
  user update a session's status. Tighten `allow update` to check the custom claim above
  before treating this as production-ready.
- **Weight verification**: there's no barcode-linked "expected weight" stored yet — the
  scale-entry UI is there for the associate's own sanity check, but doesn't block the
  Verified button. Wire it to per-item expected weights in your product catalog if your
  report needs that enforced.

## Next steps we can tackle together
- Wire a real product catalog into Firestore instead of the hardcoded `PRODUCT_DB`.
- Add Firebase custom claims for a properly secured employee role.
- Add order history to `profile.html` (currently static placeholder cards).
- Polish the "Reject Order" flow so the customer sees a clear rejection screen instead of
  just stopping at `token.html`.

## Update log (round 2 of changes)

- Dashboard: profile avatar (top-left) now links to `profile.html`; removed the non-functional settings icon; removed the duplicate "Scan" bottom-nav tab (Scan Item CTA already covers that); removed the "Recent Scans" mock section; cart summary card now shows your real cart total.
- Currency switched from $ to ₹ everywhere.
- `scan.html`: items are now added to the cart **immediately** on barcode detection (no extra "Add to Cart" tap needed) — this was the bug causing "vibrates but nothing gets listed." The cart is now a small **draggable floating pill** (drag it out of the camera's way; tap to expand). Removed the profile icon from this page's header.
- Removed the profile/avatar icon from `cart.html`, `token.html`, and `payment.html` headers.
- `employee-login.html`: **Forgot password** now sends a real Firebase password-reset email; **IT Support** and **Scan ID** now open `support.html`.
- Added `employee-home.html` — a proper landing screen after employee login (shows who's signed in, a "Start Scanning" button, quick links) instead of jumping straight into the camera. Employee bottom nav and back button now route through it.
- Removed the floating "Inventory Low" popup from the employee scanner screen.
- `profile.html`: tap the avatar to upload a real profile picture (stored as a small base64 image on your `users/{uid}` Firestore doc — no default placeholder photo anymore); added an **Age** field; **Order History** now pulls real completed orders from Firestore instead of fake entries.
- Added `<link rel="preconnect">` hints for Firebase/Google domains on every page to shave connection time off each navigation.

### About the "delay when clicking the back arrow"
This is a **multi-page app** (each screen is its own `.html` file), not a single-page app — so every navigation, including "back," does a real page load: it re-downloads/re-runs the Firebase SDK and re-checks your login state over the network. Preconnect hints (added above) help, but two things will help more if it's still noticeable:
1. Firestore's real-time listener on `token.html` (`onSnapshot`) can block the browser's **back-forward cache**, forcing a full reload instead of an instant restore. If you don't need live updates on that screen after the customer has already been redirected away from it, that's the tradeoff.
2. The real fix is converting this into a single-page app (one HTML shell, JS swaps views) so navigation never re-touches the network. That's a bigger rewrite — let me know if you want to go that route before your submission.

### About connecting to "the DMart database"
There's no public DMart API/database you (or any external developer) can connect to — retailers don't expose their internal inventory systems like that, for security and competitive reasons. The realistic paths for a project like this:
1. **Build your own product catalog** in Firestore (`products/{barcode}` → name, price) and populate it yourself — either by hand for a demo, or by bulk-importing a CSV of sample SKUs. I can write that import script if you want.
2. If your college project needs to *look* like it's talking to a real retailer's system, mocking a `products` collection with realistic-looking data is the standard approach for this kind of academic project — real POS/inventory integration would require a formal partnership/API agreement with the retailer.

### One-time Firestore index needed
The Order History query on `profile.html` filters by `customerUid` + `status` and sorts by `createdAt` — Firestore requires a composite index for that combination. The first time you load the profile page, open the browser console: Firestore will log an error with a direct link that creates the exact index for you in one click. (Or create it manually: Firestore Console → Indexes → Composite → collection `sessions`, fields `customerUid` Ascending, `status` Ascending, `createdAt` Descending.)

## Product catalog (CSV import)

Real barcodes need real product data. `products-template.csv` is a starting example — open
it in Excel/Sheets, add your own products (columns: `barcode,name,category,price`), save as
CSV, then:

1. Open `import-products.html` in your browser (sign in via `login.html` in another tab first)
2. Upload your CSV, check the preview table, click **Upload to Firestore**

`scan.html` now checks this Firestore `products` collection first when a barcode is
scanned, and only falls back to the small built-in demo list if nothing matches (e.g. if
you haven't uploaded a catalog yet).

**Important**: `import-products.html` is an admin-only tool, not part of the customer/employee
flow — don't link to it from the app, and lock down or delete it before a real deployment
(right now, anyone signed in could write to your product catalog through it).

## Update log (round 3 of changes)

- **Fixed the "one scan = many items" bug**: `scan.html` now uses a global 2-second scan lock instead of per-code debouncing. The old bug happened because Quagga2 sometimes decodes the *same* physical barcode as slightly different strings across consecutive video frames (a well-known false-positive pattern with camera-based barcode scanning) — since those were technically "different codes," they slipped past the old same-code debounce. The new lock ignores *any* detection for 2 seconds after a successful add, regardless of what code it reads.
- **`edit-profile.html`** (linked from Profile → Edit Profile): Full Name, Age, Gender (Male / Female / Prefer not to say), Phone Number, Email (read-only), and Change Password — the password section only shows up for accounts that actually have a SkpQ password (i.e. not Google sign-in accounts, since those don't have one to change).
- Removed the old "Profile Settings" / "Notifications" dead-end rows from `profile.html` — replaced with the single working "Edit Profile" entry.
- **Dashboard now shows real data**: "Last Visit" reads your actual previous login time from Firestore (and updates it after loading); "Total Spent" and "Points Balance" are computed live from your real paid orders (₹1 spent = not fake — 1 point per ₹10 spent, with Bronze/Silver/Gold tiers based on total spend).
- Fixed a real bug in `profile.html` where a leftover script block referenced an "age" input that no longer exists on that page (it moved to `edit-profile.html`) — this would have silently broken the whole page's JavaScript (avatar upload, order history, everything) on load. Removed it.

## Fix: auth/operation-not-supported-in-this-environment
`login.html`'s Google sign-in now uses `signInWithRedirect` on mobile devices (and falls back
to it automatically on desktop if the popup method fails) instead of only `signInWithPopup`.
Popups are blocked or unsupported in a lot of mobile contexts — especially in-app browsers
like WhatsApp/Instagram's built-in browser — which is what usually throws this exact error.
If you still see it: make sure you're opening the site in an actual browser app (Chrome/Safari),
not through a link opened inside another app.

## Update log (round 4 of changes)

- `scan.html`: each item in the cart drawer now has a delete button so a customer can remove
  something they scanned by mistake, without leaving the scan screen. The bottom of the drawer
  now has two clear buttons: **Finalize Bill** (go to checkout) and **Continue Scanning** (just
  collapses the drawer back to the camera view — nothing is lost, you can reopen it any time by
  tapping the floating cart pill).
- `cart.html`: the "Remove" link on each item was only visible on `:hover`, which doesn't exist
  on touch screens — it's now always visible so it actually works on phones.

## Bugfix: camera not opening on scan.html

A previous edit left the `removeScannedItem` function missing its closing `}` — a real
JavaScript syntax error. This silently broke the **entire** script on that page (not just the
remove button), which is why the camera stopped opening at all. Fixed, and every inline
script on every page has now been syntax-checked directly with Node to catch anything similar
before it ships.

## Update log (round 5 — weight tracking)

Weight is now tracked end-to-end:

- **`products-template.csv`** has a new `weight_grams` column — this is now required for every product.
- **`import-products.html`** reads and uploads it to Firestore as `weightGrams` on each product doc, and flags any row missing a weight in the preview table.
- **`scan.html`**: each scanned item's weight shows in the confirmation toast and in the cart drawer list (per item and running total).
- **`cart.html`** (the bill): every line item shows its weight, and there's now a prominent **Total Weight** line in the bill summary next to Subtotal/Total. This total is also saved onto the Firestore session (`totalWeightGrams`) when the token is generated.
- **`order-verification.html`** (employee screen — the important one): now shows the order's **Expected Weight** up top next to Total Items, and each item in the checklist shows its individual weight. The "Actual Weight Verified" scale input now actually **compares** the associate's reading against that expected weight (5% tolerance, minimum 30g) and shows a clear Match/Mismatch status — this was stubbed out with a fixed placeholder before; it's now driven by the real per-product weights you upload.

**You must re-upload your product CSV** (with the new `weight_grams` column filled in) through `import-products.html` for this to work — products already in Firestore from before won't have a weight until you do.

## Update log (round 6 — installable app icon / PWA)

Added everything needed to make this a **PWA (Progressive Web App)** — installable with a real
home-screen icon, opens full-screen without browser chrome, no app store needed:

- `manifest.json` — app name, theme color, and icon set
- `icons/` — a simple generated teal cart-icon logo (192px, 512px, and a maskable 512px variant
  for Android's adaptive icon shapes, plus an Apple touch icon and favicon). This is a
  placeholder — swap these files for your own design anytime, just keep the same filenames/sizes.
- `sw.js` — a minimal service worker (required by most browsers for installability); uses a
  "network first" strategy so you always get fresh content while online, only falling back to
  a cached copy if there's no connection.
- `js/pwa.js` — registers that service worker; included on every page.
- Every page now links the manifest and icons, plus Apple-specific tags so it also installs
  cleanly from Safari on iPhone.

### How your friend/testers actually get the icon on their phone

**Android (Chrome):** open the site → Chrome shows an "Install app" banner automatically, or
tap the ⋮ menu → **Add to Home screen** / **Install app**.

**iPhone (Safari):** open the site → tap the **Share** button (square with an arrow) → **Add to
Home Screen**. (This only works from Safari — Chrome on iOS can't install PWAs, that's an Apple
restriction, not something in your code.)

Either way, it drops a real icon that opens full-screen, no address bar, indistinguishable at a
glance from a "real" installed app.

### A limitation worth knowing (for your project report)
This is still a website under the hood — it's not published on the Play Store/App Store, and
strictly speaking the "install" is a bookmark + fullscreen shell rather than a compiled native
app. For a real Play Store listing you'd need a completely different toolchain (e.g. wrapping it
with Capacitor/Cordova, or a native rewrite). For a project like this, though, the PWA approach is
the standard, legitimate way to get an app-icon experience without that overhead.

## Update log (round 7 — performance, offline resilience, login flow)

### Smoothness / lag fix (the big one)
Every page was loading Tailwind via `cdn.tailwindcss.com` — that CDN script isn't a stylesheet,
it's a full JavaScript compiler that re-scans and re-compiles your CSS live in the browser on
every single page load. That's almost certainly what "lag" you were feeling, especially on a
phone. Replaced it with a **precompiled, minified `css/tailwind.css`** built once with the real
Tailwind CLI — all 15 pages now just load a static stylesheet instead of running a compiler.
This should be a very noticeable speed difference, particularly on first load of each page.

If anything looks visually off after deploying (a missing color, spacing that looks wrong), it
means some class name wasn't caught by the build scan — tell me which page/element and I'll add
it to the safelist in the build config.

### First-time / returning login flow
`index.html` (the role-selection screen) now checks if you're already signed in on load — if so,
it skips role selection and login entirely and sends you straight to your dashboard (customer)
or employee home (staff). You'll only ever see the role-selection/login screens once, the first
time, or after you explicitly log out. Also fixed a related bug: the employee "which role" flag
was stored in a way that got wiped every time the browser tab closed — switched it to persist
properly across app restarts, matching how the login itself persists.

### Offline resilience
Enabled Firestore's offline persistence (`enablePersistence`) — this caches data locally and
queues up any writes made while offline, auto-syncing once the connection returns. This helps
with **brief/flaky internet**, which is the DMart situation you described.

**Important limitation to understand**: this can't make the customer↔employee handoff work with
*zero* connectivity on both ends at the same moment — a customer's phone and an employee's
terminal are two separate devices, and syncing a token's status between them fundamentally
requires *some* network path connecting them (internet, or at minimum a shared local network).
If DMart's internet drops out completely for a while, in-progress checkouts at that exact moment
will stall until it's back — there's no way around that without building a completely separate
local-network-only backend (a much bigger project, and not something a Firestore-based app can
do). What this update *does* fix: brief drops, spotty connections, and any screen a single device
is using on its own (browsing, viewing cart, etc.) staying responsive through short outages.

## Fix: Google sign-in silently bouncing back to login page

The previous fix for `auth/operation-not-supported-in-this-environment` forced all mobile
devices to use the **redirect** sign-in method — but that error turned out to be caused by
testing over `file://` instead of `https://`, not actually a popup problem. Redirect-based
sign-in is more fragile on mobile in practice (it depends on the browser correctly carrying
auth state across the round-trip to Google and back, which storage/cookie restrictions can
silently break) — that's what was causing "loads and brings me back to login page" with no
error. Switched back to trying **popup first on every device**, only falling back to redirect
if the popup genuinely can't open.

## Fix: scanned item shows "unrecognized" / 0g on first attempt

`scan.html` used to trust the *very first* barcode read it got from the camera. Quagga2 fires a
detection on every single frame, and any one frame can misread a barcode — especially the first
frame or two before the camera focuses — which is why the first couple of scan attempts on the
same product could come back as "unrecognized item" with a random code and 0g weight, while a
later attempt (once the camera settled) read it correctly.

Fixed by requiring the scanner to see the **same code 3 times within 800ms** before it's trusted
and committed to the cart — a single bad frame no longer gets treated as the final answer. This
adds a very small delay (a few tenths of a second) to each scan but should make first-attempt
reads reliably correct.

## UPI payment (demo-grade)

`payment.html`'s UPI option now actually works: selecting UPI and tapping Pay Now opens a real
`upi://pay` deep link, which launches the customer's UPI app (Google Pay, PhonePe, etc.) with
the amount pre-filled. After that, a confirmation dialog asks the customer to confirm they
completed the payment before the order is marked paid.

### ⚠️ Before your demo — one required edit
Open `payment.html`, find this line near the bottom script:
```js
const MERCHANT_UPI_ID = "your-upi-id@okhdfcbank"; // <-- replace this
```
Replace `"your-upi-id@okhdfcbank"` with a **real UPI ID** — your own personal Google
Pay/PhonePe/Paytm UPI ID works fine for a demo. If you leave the placeholder in, the UPI app
will open but show "Invalid UPI ID" instead of a real payment screen.

### Known limitation (be upfront about this in your demo/report if asked)
This is **not** a verified payment integration — there's no automatic server-side confirmation
that money actually moved. The app opens the UPI app and then just asks the customer to
self-confirm ("Yes, I've Paid"). A real deployment would need a payment gateway (Razorpay/PayU)
with a backend (Firebase Cloud Function) to verify the transaction server-side before marking
an order paid — that's a bigger integration we can build later if you want it production-grade,
but this deep-link approach is the right scope for today's demo.

Card and Digital Wallet options are still visual/decorative placeholders, unchanged.
