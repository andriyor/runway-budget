# Matches Rozetka orders to Runway Budget transactions and writes the notes to add.
# usage: python3 match.py <orders.txt> <transactions.jsonl> <notes.json>
#   orders.txt: one order per line, "num | 23 вересня 2026 | 278 | CANCELLED or empty | item ; item"
#   transactions.jsonl: one GET /api/accounts/:id/transactions response per line
#   notes.json: written, [{id, externalId, note, kind}] for transactions that have no note yet
# kind: exact (same amount, charged on the order day or up to 10 days later) or near (same day, charged up to 2%
# more, e.g. a card fee). Prints both, plus what stayed unmatched, for the user to review before writing.
import json, re, sys
from datetime import date, datetime
from zoneinfo import ZoneInfo

orders_file, tx_file, out_file = sys.argv[1:4]
months = {m: i + 1 for i, m in enumerate('січня лютого березня квітня травня червня липня серпня вересня жовтня листопада грудня'.split())}

orders = []
for line in open(orders_file):
    if not line.strip():
        continue
    num, d, total, cancelled, items = [s.strip() for s in line.split('|', 4)]
    dd, mm, yy = d.split()
    # drop trailing product codes in parentheses, e.g. "(UGR-10368)", and Rozetka's "Додатковий продаж" line
    names = [re.sub(r'\s*\([^()]*\d[^()]*\)\s*$', '', i).strip() for i in items.split(' ; ') if i and i != 'Додатковий продаж']
    orders.append(dict(num=num, day=date(int(yy), months[mm], int(dd)), total=float(total or 0),
                       cancelled=bool(cancelled), note=(f'Rozetka №{num}: ' + '; '.join(names))[:1000]))

kyiv = ZoneInfo('Europe/Kyiv')
txs = [t for l in open(tx_file) if l.strip() for t in json.loads(l)
       if 'rozetka' in t['description'].lower() and t['amount'] < 0 and not t['note']]
for t in txs:
    t['day'] = datetime.fromisoformat(t['time'].replace('Z', '+00:00')).astimezone(kyiv).date()

def pairs(test):
    return sorted((abs((t['day'] - o['day']).days), o['num'], t['id']) for o in orders for t in txs if o['total'] and test(o, t))

exact = pairs(lambda o, t: abs(-t['amount'] - o['total']) < 0.01 and 0 <= (t['day'] - o['day']).days <= 10)
near = pairs(lambda o, t: t['day'] == o['day'] and o['total'] < -t['amount'] <= o['total'] * 1.02)

by_order = {o['num']: o for o in orders}
by_tx = {t['id']: t for t in txs}
used, matches = set(), []
for kind, found in (('exact', exact), ('near', near)):
    for gap, num, tid in found:
        if num in used or tid in used:
            continue
        used |= {num, tid}
        matches.append((kind, by_tx[tid], by_order[num], gap))

matches.sort(key=lambda m: m[1]['day'])
for kind, t, o, gap in matches:
    extra = f" +{gap}d" if gap else ''
    print(f"{kind:5} {t['id']:>5} {t['day']} {t['amount']:>10} ← №{o['num']} {o['total']:g}{extra}"
          f"{' CANCELLED' if o['cancelled'] else ''}  {o['note'][len('Rozetka №') + len(o['num']) + 2:][:60]}")
print('\nunmatched transactions (no note yet):')
for t in sorted(txs, key=lambda t: t['day']):
    if t['id'] not in used:
        print(f"      {t['id']:>5} {t['day']} {t['amount']:>10}  {t['description']}")
json.dump([{'id': t['id'], 'externalId': t['externalId'], 'note': o['note'], 'kind': kind} for kind, t, o, _ in matches],
          open(out_file, 'w'), ensure_ascii=False)
print(f"\n{len(matches)} notes written to {out_file}")
