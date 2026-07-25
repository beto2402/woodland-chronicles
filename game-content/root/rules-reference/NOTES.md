# Root — rules reference notes

Source: `Root_Base_Law_Oct_2025.pdf` (official "Law of Root" rulebook, kept in this folder
locally but **not committed to git** — see `.gitignore`). Section numbers below refer to that
document. These are my own prose summaries for building wiki content, not a copy of the text.

## Battle (4.3)

- The **attacker** rolls both battle dice. Attacker deals hits equal to the higher roll to the
  defender; defender deals hits equal to the lower roll to the attacker. Equal rolls = equal hits.
- Each side's rolled hits are capped by their own warrior count in the clearing of battle.
- If the defender has no warriors there, the attacker deals one extra automatic hit ("Defenseless").
- Order: (1) defender may Ambush, (2) before-roll effects, (3) roll dice, (4) after-roll effects,
  (5) count hits, (6) deal hits (warriors removed before buildings/tokens on the losing side).

## Ambush (2.1.2, 4.3.1)

- 5 ambush cards in the shared deck: 1 mouse, 1 rabbit, 1 fox, 2 bird. Never crafted.
- The **defender** may play one matching the clearing's suit to deal 2 immediate hits (uncapped
  by warrior count), then discards it.
- The **attacker** may foil it by also playing a matching ambush card — if so, the defender's
  ambush is discarded without effect and no hits are dealt from it.
- If ambush hits remove all attacking warriors/pawns, the battle ends immediately.

## Dominance cards (3.3)

- 4 in the deck (mouse/rabbit/fox/bird suits). Never crafted.
- Activating: during Daylight, with ≥10 VP, place it in your play area and remove your score
  marker — you can no longer score points the normal way.
- Win check happens **at the start of your Birdsong**, not when activated:
  - Mouse/Rabbit/Fox Dominance: rule 3 clearings of that suit.
  - Bird Dominance: rule 2 clearings in **opposite corners** of the map.
- An activated dominance card can be spent for its suit like a normal card of that suit.

## Crafting, generally (4.1)

- Cost = activating crafting pieces of the suit(s) shown bottom-left on the card; each piece
  activates once per turn. A card's own suit (top-left) determines which piece type can craft
  it, not where its effect can later be used.
- Immediate effects: resolve then discard (items go from the shared item supply to your Crafted
  Items box). Persistent effects: stay in your play area; no duplicates allowed.

## Ruling a clearing (2.5)

A player rules a clearing if they have more combined **warriors + buildings** there than every
other player. Tokens and pawns do NOT count toward rule. Ties = no one rules it.

## Marquise de Cat (6)

- Crafting piece: **Workshops**.
- Birdsong: place 1 wood per Sawmill in each clearing that has one.
- Daylight: may craft via Workshops first, then up to 3 actions (+1 per Bird card spent, not
  itself counted as an action), any order/repeats: Battle, March (up to 2 moves), Recruit (1
  warrior per Recruiter, **once per turn only**), Build (choose a ruled clearing + building
  type, pay wood from that clearing/adjacent ruled clearings/clearings connected through ruled
  clearings, place + score the VP shown), Overwork (spend a card matching a Sawmill's clearing
  to place 1 wood there).
- Evening: draw 1 + 1 per uncovered draw-bonus icon; discard to 5 if over.

## Woodland Alliance (8)

- Crafting piece: **Sympathy tokens** (not tied to ruling).
- **Guerrilla War** (8.2.2): as *defender*, the Alliance deals hits equal to the *higher* roll
  and the attacker deals hits equal to the *lower* roll — the opposite of normal battle.
- Supporters stack = their "hand" of spendable cards by suit; capped at 5 unless they have a
  Base on the map (then unlimited).
- Birdsong — both actions repeatable any number of times, limited by resources:
  - **Revolt**: target a *sympathetic clearing with no base* that matches a Base still in your
    supply (only 1 Base per suit, so ≤3 total normally). Spend 2 supporters matching the
    clearing's suit. Effect: remove all enemy pieces there, place the base, place warriors equal
    to the number of sympathetic clearings of that suit, and place 1 warrior directly into the
    Officers box (auto-officer).
  - **Spread Sympathy**: target an unsympathetic clearing adjacent to a sympathetic one (or any
    clearing if you have none yet). Spend supporters matching its suit, per the cost shown above
    the sympathy token on your track. **Martial Law**: +1 more matching supporter if the target
    clearing has ≥3 warriors belonging to another single player. Place the token, score the VP
    shown.
- Daylight — unlimited, any order: Craft (activate sympathy tokens), Mobilize (add 1 card from
  hand to Supporters stack), Train (spend a card whose suit matches a clearing *with one of your
  Bases* to turn a warrior into an Officer).
- Evening — "Military Operations": up to **your number of Officers** actions, any order/repeats:
  Move (1 move), Battle, Recruit (1 warrior in any clearing with a Base), Organize (remove 1
  Alliance warrior from an unsympathetic clearing to place a sympathy token there instead, score
  the VP shown). Then Draw and Discard — same generic rule as Marquise (draw 1 + 1 per uncovered
  bonus, discard to 5).

## Item tokens (Appendix C.1.2)

Base game items: Boot, Sword, Bag, Hammer, Tea, Coins, Crossbow, Torch (7 types, 23 tokens
total). I have not yet matched every base-deck card to its item/suit — `translations/base-deck.json`
covers 32 of 54 unique card names; the rest (including whatever card grants the single Torch
token) still need sourcing.
