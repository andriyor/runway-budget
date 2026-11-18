---
name: brain-notes
description: Fill notes on Brain (brain.com.ua) transactions in Runway Budget with what was bought, read from the user's Brain order history in Chrome and matched by date and amount. Use when the user asks to add Brain purchases to transaction notes, label Brain spending, or rerun this after new orders.
---

# Notes for Brain transactions

Like `rozetka-notes` (read it, and `runway-api`: show the matches and get a yes before writing). Notes read
`Brain №<order>: <items>`; only transactions without a note are touched. Work in the session scratchpad `$D`.

## 1. Brain transactions without a note

Fetch every account's transactions into `$D/local-tx.jsonl` as in `rozetka-notes` step 1. Brain charges have the
description exactly `Brain`; filtering on "brain" also catches `JetBrains`, so compare the whole description.

## 2. Read the orders in Chrome

`brain.com.ua/ukr/cabinet/dashboard/` lists every order, the newest first, with a «Показати ще» button
(`.load_more_orders_btn`) that loads more. Item names are in the page as the product images' alt texts. Load
everything, then put one order per line on the page and read it with `get_page_text`:

```js
for (let i = 0; i < 10; i++) {
  const b = document.querySelector('.load_more_orders_btn')
  if (!b || b.offsetParent === null) break
  b.click()
  await new Promise((r) => setTimeout(r, 2000))
}
// order numbers are 11 digits (00000242245) or NN-NNNNNNNN (72-00862088)
const out = [...document.querySelectorAll('*')]
  .filter((e) => e.children.length === 0 && /^(\d{11}|\d{2}-\d{8})$/.test(e.textContent.trim()))
  .map((e) => {
    let c = e
    while (c.parentElement && !/₴/.test(c.textContent)) c = c.parentElement
    const t = c.textContent.replace(/\s+/g, ' ')
    return [e.textContent.trim(), (t.match(/від (\d\d\.\d\d\.\d{4})/) || [])[1], (t.match(/([\d ]+)₴/) || [])[1].trim(),
      (t.match(/₴\s*(\S+)/) || [])[1], [...new Set([...c.querySelectorAll('img')].map((i) => i.alt).filter(Boolean))].join(' ; ')].join(' | ')
  })
const pre = document.createElement('pre')
pre.textContent = out.join('\n')
const main = document.createElement('main')
main.appendChild(pre)
document.body.replaceChildren(main)
out.length
```

Each line: order number, date, `<year> <total>` (the year sticks to the total; the total is the last number),
status, items. The page also has the phone number and delivery details; leave them out. Close the tab.

## 3. Match

By hand; there are few. Usually the same amount on the order day. Things seen so far:

- An online order (`20-…`, `72-…`) can be charged a few days later and a little less than the total, after BrainUp
  points (554 for a 598 order, 1589 for 1626). Note both amounts: `(замовлення 598, оплачено 554)`.
- «Відмінено» orders were never charged; nothing to note.
- Some charges have no order in the cabinet (small sums, recent in-store buys); list them as unmatched.
- No refunds so far. If a positive `Brain` or `Скасування. Brain` row shows up, give it the purchase's note
  prefixed `повернення за`; the app pairs a full «Скасування.» with its purchase on its own.

Shorten long product titles (drop the SKU in brackets). Show the list and the unmatched charges, and ask before
writing.

## 4. Write

As in `rozetka-notes` step 4: PATCH the notes locally, then on the Pi by `externalId`.
