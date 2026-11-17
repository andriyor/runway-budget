---
name: rozetka-notes
description: Fill notes on Rozetka transactions in Runway Budget with what was ordered, read from the user's Rozetka order history in Chrome and matched by date and amount. Use when the user asks to add Rozetka purchases to transaction notes, label Rozetka spending, or rerun this after new orders.
---

# Notes for Rozetka transactions

Reads the order history at `rozetka.com.ua/ua/cabinet/orders/` through the Chrome extension (the user is signed in
there), matches orders to Rozetka transactions, and writes `Rozetka №<order>: <items>` as each one's note. Only
transactions without a note are touched, so rerunning it picks up new orders and never overwrites.

Read the `runway-api` skill first: notes are writes to the user's real data, so show the matches and get a yes
before writing. Work in the session scratchpad `$D`.

## 1. Rozetka transactions without a note

```sh
curl -s localhost:3000/api/accounts | python3 -c 'import json,sys; [print(a["id"]) for a in json.load(sys.stdin)]' \
  | while read id; do curl -s localhost:3000/api/accounts/$id/transactions; echo; done > "$D/local-tx.jsonl"
```

Note the earliest Rozetka transaction without a note (the description contains "Rozetka"); orders older than
that are not needed.

## 2. Read the orders in Chrome

The orders page is drawn in the browser: fetching its HTML returns no orders, and no order API shows in the
network log. Each order is an `li.order`. Its details (items, total) are already in the page but hidden until
expanded, so read `textContent`, never `innerText`, and don't click to expand. Item names are the `.product-link`
elements. Pages are `/ua/cabinet/orders/` and `/ua/cabinet/orders/page/<n>/`, 10 orders each, newest first.

Navigating clears page variables, so collect into `localStorage`:

1. On the orders tab, run `localStorage.setItem('__claude_orders', '[]')`.
2. For each page, in one `browser_batch`: navigate, wait 3 seconds, then run:
   ```js
   const got = [...document.querySelectorAll('li.order')].map((li) => {
     const tc = li.textContent.replace(/\s+/g, ' ')
     return {
       num: (tc.match(/№\s*(\d+)/) || [])[1],
       date: (tc.match(/від (\d+ \S+ \d{4})/) || [])[1],
       total: ((tc.match(/Разом\s*([\d ]+)\s*₴/) || [])[1] || '').replace(/\s/g, ''),
       items: [...new Set([...li.querySelectorAll('.product-link')].map((a) => a.textContent.trim()).filter(Boolean))],
       cancelled: /Скасовано|Не влаштовує/.test(tc),
     }
   })
   const all = JSON.parse(localStorage.getItem('__claude_orders'))
   all.push(...got)
   localStorage.setItem('__claude_orders', JSON.stringify(all))
   ;[got.length, all.length, got.at(-1)?.date]
   ```
   Stop once a page's last date is older than the earliest transaction from step 1.
3. `javascript_tool` cuts long results off, so put the orders on the page as text and read them with
   `get_page_text`:
   ```js
   const all = JSON.parse(localStorage.getItem('__claude_orders'))
   const pre = document.createElement('pre')
   pre.textContent = all
     .map((o) => [o.num, o.date, o.total, o.cancelled ? 'CANCELLED' : '', o.items.join(' ; ')].join(' | '))
     .join('\n')
   const main = document.createElement('main')
   main.appendChild(pre)
   document.body.replaceChildren(main)
   all.length
   ```
4. Save that text as `$D/rozetka-orders.txt`, one order per line. Then `localStorage.removeItem('__claude_orders')`
   and close the tab.

Only the order number, date, total, status and item names are taken. The page also shows the address, phone and
email; leave them out.

## 3. Match

```sh
python3 .claude/skills/rozetka-notes/match.py "$D/rozetka-orders.txt" "$D/local-tx.jsonl" "$D/notes.json"
```

It pairs each transaction with at most one order:

- **exact**: the same amount, charged on the order day or up to 10 days later, closest first;
- **near**: charged the same day for up to 2% more than the order total, usually a card fee.

It also lists the Rozetka transactions left without a match: RozetkaPay payments, Rozetka services and orders
paid another way have no order here. Show the user both lists and ask before writing. The near matches are
included only with their yes.

## 4. Write

Locally, one PATCH per note:

```sh
python3 - "$D/notes.json" <<'EOF'
import json, sys, urllib.request
for n in json.load(open(sys.argv[1])):
    req = urllib.request.Request(f"http://localhost:3000/api/transactions/{n['id']}", method='PATCH',
        data=json.dumps({'note': n['note']}).encode(), headers={'content-type': 'application/json'})
    urllib.request.urlopen(req)
EOF
```

On the Raspberry Pi (see the `redeploy-raspberry-pi` memory): transaction ids differ there, so match by
`externalId`. Fetch its transactions the same way through `ssh rp` and `localhost:8087`, skip any that already
have a note, then send `<id> <json body>` lines to a `while read -r id body; do curl -X PATCH …; done` loop over
`ssh rp`.

Report how many notes were written on each side, the uncertain or unmatched transactions, and read one note back.
