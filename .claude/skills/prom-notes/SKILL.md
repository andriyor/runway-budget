---
name: prom-notes
description: Fill notes on Prom.ua transactions in Runway Budget with what was ordered, read from the user's Prom order history in Chrome and matched by date and amount. Use when the user asks to add Prom purchases to transaction notes, label Prom spending, or rerun this after new orders.
---

# Notes for Prom transactions

The same procedure as the `rozetka-notes` skill: read it and follow its steps 1, 3 and 4, with `prom` in place of
`Rozetka`. Only step 2, reading the orders, differs. Notes read `Prom №<order>: <item>`, and only transactions
without a note are touched.

## 1. Prom transactions without a note

As in `rozetka-notes` step 1; Monobank names them `prom.ua`, refunds `Скасування. prom.ua`.

## 2. Read the orders in Chrome

`my.prom.ua/ua/cabinet/user/orders?filter=all&page=<n>&perPage=20`, newest first. The page loads orders over
GraphQL whose bodies don't show in the network log, so read the DOM after waiting 3 seconds. Each order card links
to `/cabinet/user/orders/<num>`; the item names are the alt texts of its product images, the date is `dd.mm.yy`,
and the total follows «До оплати … :». On one page, run:

```js
const out = [], seen = new Set()
for (const a of document.querySelectorAll('a[href*="/cabinet/user/orders/"]')) {
  const num = a.href.match(/orders\/(\d+)/)[1]
  if (seen.has(num)) continue
  seen.add(num)
  // the card: the closest ancestor holding exactly one order number
  let c = a
  while (c.parentElement && c.parentElement.textContent.match(/№\s*\d{6,}/g)?.length === 1) c = c.parentElement
  const tc = c.textContent.replace(/\s+/g, ' ')
  out.push([num, (tc.match(/(\d\d\.\d\d\.\d\d)/) || [])[1],
    ((tc.match(/До оплати[^:]*:\s*([\d .,]+)₴/) || [])[1] || '').replace(/\s/g, ''),
    /Повернення|Скасовано/.test(tc) ? 'CANCELLED' : '',
    [...new Set([...c.querySelectorAll('img')].map((i) => i.alt).filter(Boolean))].join(' ; ')].join(' | '))
}
const pre = document.createElement('pre')
pre.textContent = out.join('\n')
const main = document.createElement('main')
main.appendChild(pre)
document.body.replaceChildren(main)
out.length
```

Read the result with `get_page_text` and save it as `$D/prom-orders.txt`. Go on to the next page only if the last
date is still newer than the earliest Prom transaction. Some cards have no product image, so their items come out
empty: open `/ua/cabinet/user/orders/<num>` for those and take the line after the total
(`document.body.innerText.split('Написати продавцю')[0].split('До оплати')[1]`). Shorten long Prom titles by hand
if you like. Leave out the delivery address, phone and name. Close the tab when done.

## 3. Match

```sh
python3 .claude/skills/match-orders.py "$D/prom-orders.txt" "$D/local-tx.jsonl" "$D/notes.json" Prom
```

Prom-specific misses to check by hand among the unmatched, and ask about before writing:

- card fees above 2% (a 672 order charged 698.88), often a day earlier in UTC;
- part paid from the Prom wallet, so the charge is smaller than the order (8.29 for 337.29);
- a refunded order's `Скасування. prom.ua` row: give it the same note as its purchase. The app already pairs the
  two and leaves them out of spending.

## 4. Write

As in `rozetka-notes` step 4, locally and on the Pi by `externalId`.
