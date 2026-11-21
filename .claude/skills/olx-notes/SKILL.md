---
name: olx-notes
description: Fill notes on OLX transactions in Runway Budget (OLX Доставка purchases, their refunds and the user's own sales), read from the user's OLX account in Chrome and matched by time and amount. Use when the user asks to add OLX purchases or sales to transaction notes, label OLX refunds, or rerun this after new orders.
---

# Notes for OLX transactions

Like `rozetka-notes` (read it, and `runway-api`: notes are writes to real data, so show the matches and get a yes
first), but OLX also refunds a lot: sellers reject orders and orders expire. Each refund is a separate transaction
and needs its own note. Work in the session scratchpad `$D`.

## 1. OLX transactions without a note

Fetch every account's transactions into `$D/local-tx.jsonl` as in `rozetka-notes` step 1. OLX rows look like:

| Description                     | What it is                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `OLX`, negative                 | a purchase (or a paid listing)                                                    |
| `Від: OLX_DOSTAVKA UAPAY`, +    | a refund of a purchase, or the payout for something the user sold                 |
| `Від: #traceable #traceable`, + | a sender Monobank hides; some OLX refunds come this way, same amount, within days |

A sale can also be paid by the buyer directly, as a transfer named after a person, a day after the order.

## 2. Read the orders in Chrome

`www.olx.ua/uk/myaccount/safedealpurchases/` (Мої покупки) and the «Мої продажі» tab beside it
(`/myaccount/safedealorders/`, reached by clicking the tab: typing a guessed URL gives a 404). Both are drawn in the
browser with 10 orders a page, and the page numbers at the bottom are buttons: click them (`find` "pagination
button 2") rather than changing the URL, which keeps page variables alive between pages.

On the first page, define a reader and keep its output in `window.__o`, then click each next page and run
`__o = __o.concat(__grab())`:

```js
window.__grab = () =>
  document.body.innerText
    .split('Відхилені')[1]
    .split('Мобільні додатки')[0]
    .split('Відкрити')
    .map((s) => s.trim().split(/\n+/))
    .filter((a) => a.length > 3)
    .map((a) => {
      const t = a.join(' ')
      return [
        (t.match(/замовлення: (\d+)/) || [])[1],
        (t.match(/(\d\d\.\d\d\.\d{4}, \d\d:\d\d)/) || [])[1],
        a[1],
        a[2] + ' ' + (a[3].startsWith('(') ? a[3] : ''),
        a[0],
      ].join(' | ')
    })
window.__o = __grab()
```

Each line is: order number, order time in Kyiv, total, status (with the reason in brackets), title. Statuses:
«Завершено успішно» went through; «Повернення коштів» was paid and refunded; «Скасовано» or «Відхилено» was never
charged. When done, put `__o.join('\n')` on the page in a `<pre>` and read it with `get_page_text` (results cut off
otherwise). Read the sales tab the same way. Leave out tracking numbers, addresses and names. Close the tab.

## 3. Match

Match by hand; there are few. Transaction times are UTC, so an order at 18:16 Kyiv shows near 15:16.

- A purchase: the same amount, charged within minutes of the order time.
- Its refund: the same amount, `OLX_DOSTAVKA` or `#traceable`, one to four days later. With two equal orders, the
  refunds go in order.
- A partial refund (e.g. 4264 charged, 4100 back): note both with the amounts.
- A sale: an income of the sale amount a day or so after it was completed.

Notes, in Ukrainian like the order titles:

- purchase: `<item> №<order>`
- refunded purchase: `<item> (<відхилено продавцем | відхилено мною | замовлення прострочено>, гроші повернули) №<order>`
- refund: `повернення за <item> №<order>`
- sale: `продаж: <item> №<order>`

Where the transaction's description does not say OLX (a `#traceable` refund, a sale paid by a person), start the
note with `OLX: `, e.g. `OLX: повернення за <item> №<order>`.

Show the list and anything unmatched, and ask before writing.

## 4. Write

As in `rozetka-notes` step 4: PATCH the notes locally, then on the Pi by `externalId`.

The app pairs a full refund with its purchase on its own (`api/src/cancellations.ts`: the `OLX_DOSTAVKA` sender,
or a hidden sender for the exact amount within 3 days) and leaves both out of spending; a partial refund stays a
refund. OLX is set to the «marketplaces» merchant category; for a partial refund, set that transaction's category
to marketplaces too (`PUT /categories/transactions/:id`), so only the part not returned counts as spending.
