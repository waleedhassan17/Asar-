# Asar — Enhanced Feature Plan
### Mission-Based Birthday Model (No Payment Gateway / No NGO Partnerships — MVP Stage)

---

## 1. The Core Model Shift

| Old Assumption | New Reality (MVP) | Design Response |
|---|---|---|
| Platform processes donations | No payment gateway yet | Shift from **"Donate"** to **"Pledge & Prove"** |
| NGOs verify impact | No partner orgs yet | Shift from **institutional verification** to **community/self-attested proof** |
| Impact = money moved | Impact = actions taken | Broaden "contribution" to include money, time, and voice equally |

**New core mechanic: Mission, not Theme.**
Instead of picking a birthday page theme, the user picks a *purpose* — and everything (timer, dashboard, reveal) is built around that mission's countdown to their birthday.

---

## 2. Mission Creation Flow

| ID | Feature | Description |
|---|---|---|
| M-01 | Mission Selector | User picks a preset mission: 🍲 Feed 100 people · 🌳 Plant 50 trees · 🎓 Sponsor a student · 🩸 Get 20 blood donors |
| M-02 | Custom Mission Builder | User defines their own goal, unit (e.g., "50 books donated"), and icon |
| M-03 | Mission Start Date | Auto-set to campaign creation date |
| M-04 | Countdown-to-Birthday Timer | Auto-calculated from creation date → birthday date; displayed prominently on the mission page |
| M-05 | Mission Duration Flexibility | If created same-day or last-minute, timer adapts (e.g., 24-hr sprint mode vs 30-day mode) |
| M-06 | Mission Visibility | Public link / private link / friends-only |

---

## 3. Contribution Without Payments — Three Participation Tracks

Since there's no in-app payment processing, contribution is redesigned around **three tracks** so the mission still feels tangible and easy:

### Track A — Pledge & Self-Report (Primary, no gateway needed)
The contributor *commits* to an action, then marks it done. This is the core mechanic for now.

| ID | Feature | Description |
|---|---|---|
| C-101 | Pledge an Action | "I'll fund 5 meals" / "I'll plant 1 tree" / "I'll donate blood" — no money moves through the app |
| C-102 | Self-Confirm Completion | Contributor marks pledge as fulfilled (checkbox + optional photo) |
| C-103 | Honor-System Counter | Confirmed pledges add directly to the mission's live tally |
| C-104 | Optional Proof Upload | Photo/receipt upload (e.g., screenshot of a personal donation elsewhere, a photo of tree planted) — not mandatory, but boosts trust score |

### Track B — Redirect-to-Give (External Links, no gateway integration needed)
The campaign owner can attach **their own trusted external links** (existing NGO donation pages, personal UPI/PayPal.me, GoFundMe, etc.) — Asar simply routes traffic and counts clicks/reported amounts. Asar never touches the money.

| ID | Feature | Description |
|---|---|---|
| C-201 | External Give Link | Owner attaches an outside link (personal UPI ID, PayPal.me, an NGO's own donation page) |
| C-202 | "I Gave" Self-Report | After clicking through, contributor can self-report what they gave, which adds to the tally (soft-verified) |
| C-203 | Click-Through Tracking | Shows "42 people clicked to give" even if exact amounts aren't confirmable |

### Track C — Non-Monetary Contribution (No money involved at all)
This is what keeps the platform from feeling like "forced charity" — most people can participate for free.

| ID | Feature | Description |
|---|---|---|
| C-301 | Volunteer Pledge | "I'll donate blood" / "I'll spend 2 hours volunteering" |
| C-302 | Share-to-Support | Sharing the mission counts as a contribution toward reach/awareness goals |
| C-303 | Wish + Action Combo | Every contribution — money, action, or share — is paired with a personal message |
| C-304 | Wish-Only Option | Friends who can't do any of the above can still leave a heartfelt message with zero pressure |

---

## 4. The "Wish + Action" Message Format

This replaces the traditional birthday wish and is core to the emotional hook.

| ID | Feature | Description |
|---|---|---|
| W-01 | Combo Message Composer | Template: "Happy Birthday! I [donated 5 meals / planted a tree / pledged 2 volunteer hours] in your name ❤️" |
| W-02 | Auto-Fill by Pledge Type | Message auto-suggests wording based on the action taken, editable by contributor |
| W-03 | Wish Wall | All wish+action messages displayed together on the mission page, most recent first |
| W-04 | Reaction/Love Button | Owner can react to individual wishes without needing to reply to each |

---

## 5. Real-Time Mission Dashboard

| ID | Feature | Description |
|---|---|---|
| D-01 | Live Tally Counter | "You've impacted 73 lives already" — updates as pledges are confirmed |
| D-02 | Category Breakdown | Meals funded / trees planted / people helped / blood donors — shown as separate mini-counters |
| D-03 | Countdown Widget | Days/hours remaining until birthday reveal, always visible |
| D-04 | Milestone Pulse Animations | Visual "pulse" or confetti burst at 25/50/75/100% of goal |
| D-05 | Contributor Avatars Feed | Small avatar stack showing who's joined, refreshing live |
| D-06 | Momentum Indicator | "12 people joined in the last 24 hours" — creates urgency without pressure |

---

## 6. The Impact Reveal — "Because of You"

This replaces the old "memories video" reveal. It's the emotional peak of the product.

| ID | Feature | Description |
|---|---|---|
| R-01 | "Because of You…" Summary Screen | Auto-generated on the birthday: headline stat + supporting breakdown |
| R-02 | Visual Impact Story | Slide/story-style format: Faces helped → Results achieved → Total impact (swipeable, Instagram-story-like) |
| R-03 | Proof-of-Impact Collage | Auto-compiled grid of contributor-submitted photos/proofs |
| R-04 | Shareable Reveal Card | One-tap export: "For my birthday, we fed 120 people ❤️" — pre-formatted for Instagram/WhatsApp/X |
| R-05 | Thank-You Auto-Reel | Short auto-generated video/story combining wishes + stats, shareable as one file |
| R-06 | Reveal Replay Page | Permanent link to revisit the completed mission anytime |

---

## 7. Trust & Proof System (Since There's No NGO Verification Yet)

Without institutional verification, trust has to come from transparency and social accountability instead.

| ID | Feature | Description |
|---|---|---|
| T-01 | Self-Attested Badge | Default label on all pledges: "Self-reported" — sets honest expectations |
| T-02 | Community Trust Score | Optional peer endorsement ("2 friends confirmed this happened") instead of formal verification |
| T-03 | Photo/Receipt Boost | Pledges with uploaded proof get a subtle "Proof attached" tag (not "Verified") |
| T-04 | Transparency Note on Mission Page | Small, honest disclaimer: "Asar tracks pledges and self-reported impact. We're growing our network of verified partners." |
| T-05 | Anti-Fraud Flagging | Users can flag suspicious/fake pledges for admin review |

*(This whole system becomes the on-ramp to real NGO verification later — see Section 9.)*

---

## 8. Avoiding the "Forced Charity" Feeling — Design Principles

These are tone/UX rules, not just features, but each maps to concrete product decisions:

| Principle | How It's Implemented |
|---|---|
| **Never require money to participate** | Track C (volunteer, share, wish-only) is always visible and equally weighted in the UI — never grayed out or secondary |
| **No guilt-based copy** | Avoid language like "Only $X raised of $Y goal" in a shaming tone; use momentum framing instead ("73 lives and counting") |
| **No public shaming of non-contributors** | Contributor list never implies who *didn't* give — silence is a valid choice |
| **Low-friction small asks** | Default pledge suggestions are small and achievable (e.g., "1 meal," not "$50") |
| **Wish-only is a first-class option** | Not buried — appears as an equal button next to "Pledge" and "Volunteer" |
| **Owner controls tone** | Owner can toggle mission page between "playful" and "serious" tone presets |
| **No dark-pattern urgency** | Countdown timer is informational, not paired with red/alarming design or push-notification spam |

---

## 9. Updated Admin View Additions (For This Model)

| ID | Feature | Description |
|---|---|---|
| A-M01 | Mission Template Manager | Add/edit preset missions (Feed, Plant, Sponsor, Blood Donors) and their unit conversions |
| A-M02 | Self-Reported Pledge Review | Queue for reviewing flagged or high-volume self-reported pledges |
| A-M03 | External Link Moderation | Approve/reject external give-links attached by campaign owners (prevent scam links) |
| A-M04 | Trust Score Configuration | Set rules for how community endorsements and proof uploads affect trust scores |
| A-M05 | Platform Transparency Log | Public-facing page showing platform-wide self-reported vs proof-attached ratio, for credibility |

---

## 10. Roadmap: Path to Full Verification (Later Phase)

This model is designed to **upgrade smoothly** once partnerships and payments are ready — nothing here needs to be rebuilt, only extended:

1. **Phase 1 (Now):** Pledge & self-report + external redirect links + non-monetary tracks
2. **Phase 2:** Add 1–2 pilot NGO partners for a subset of missions → introduces "Verified" badge alongside "Self-reported"
3. **Phase 3:** Integrate a payment gateway → Track A pledges become real in-app transactions
4. **Phase 4:** Automated proof pipelines from partner orgs (receipts, delivery confirmations) replace manual admin review

---

## 11. Summary of the Emotional Repositioning

| Old Framing | New Framing |
|---|---|
| "Wish me a happy birthday" | "Join my purpose" |
| "Donate money" | "Pledge an action — money, time, or voice" |
| "Thanks for the wishes" | "Because of you, we fed 120 people ❤️" |
| Verified receipts | Honest self-reporting + growing trust system |
| Charity ask | Shared celebration with shared impact |

---

*This document extends the original Asar Feature Specification and should be read alongside it — it modifies Sections 2.2–2.7 (Campaign Creation, Contribution, Dashboard, Impact Reveal, Sharing) to reflect the current no-payment, no-partner MVP stage.*