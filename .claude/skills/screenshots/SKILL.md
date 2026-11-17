---
name: screenshots
description: Retake the README screenshots of Runway Budget from made-up demo data and publish them in a GitHub issue. Use when the user asks to refresh, retake or update the screenshots, or after a change that alters how a pictured page looks.
---

# Refreshing the screenshots

Screenshots always come from the demo seed, never from the user's own data. They live in a GitHub issue
("Screenshots (added YYYY-MM-DD)", currently #3) and the README links to them.

## 1. Decide what to retake

Compare what changed with the README's screenshots (the main image, then the table under "More screenshots").
Retake only the pages whose look changed. Pages and how they are taken:

| Screenshot              | URL (hash)                             | Viewport             |
| ----------------------- | -------------------------------------- | -------------------- |
| Plan (the main image)   | `#/plan`                               | 1280 wide, full page |
| Balances                | `#/`                                   | 1280 wide, full page |
| Spending                | `#/spending`                           | 1280 wide, full page |
| Transactions            | `#/transactions`                       | 1280 wide, full page |
| A category selected     | `#/transactions`, click a category bar | 1280 wide, full page |
| Merchant and the list   | `#/transactions`, scrolled down        | 1280 wide            |
| Essential spending only | `#/transactions`, «Необхідні» switch   | 1280 wide, full page |
| Balances on a phone     | `#/`                                   | 390 wide             |

All of them are dark mode.

## 2. Seed and run a demo, away from the real data

Use a new scratch directory `$D` (the session scratchpad). Never point anything at `api/data.db`.

```sh
pnpm --filter api demo:seed "$D/demo.db"        # refuses to overwrite an existing file
pnpm --filter api build                          # api/dist must exist
R=$PWD
(cd "$D" && DB_FILE="$D/demo.db" nohup "$R/api/node_modules/.bin/fastify" start -p 3140 "$R/api/dist/app.js" > "$D/api.log" 2>&1 &)
(API_URL=http://localhost:3140 nohup pnpm --filter web exec vite --port 5180 --strictPort > "$D/web.log" 2>&1 &)
curl -s localhost:5180/api/accounts               # should list the demo accounts, e.g. «Долари вдома»
```

The API starts outside `api/` so it does not load the Monobank token from `api/.env`. Ports 3000, 3124, 5173 and
5174 may already be the user's own servers; pick free ones and check with `lsof -iTCP:<port> -sTCP:LISTEN`.

If the pictured page needs data the seed lacks, add it to `api/scripts/seed-demo.mjs` (made-up names; public
shop brands are fine) and seed a new file.

## 3. Take them

Plain pages, with the Playwright CLI (`npx -y playwright@1.62.1`; `npx playwright install chromium` once if no
browser is cached):

```sh
npx -y playwright@1.62.1 screenshot --full-page --color-scheme=dark --viewport-size=1280,800 \
  --wait-for-timeout=3000 "http://localhost:5180/#/plan" "$D/plan.png"
```

Leave out `--full-page` for a fixed view, and use `--viewport-size=390,844` for the phone. Pages that need a click
first (a category selected, the essential switch) need a short Playwright script, or the Chrome extension.

Look at every image before publishing: nothing loading, no error banner, the new feature in view.

## 4. Upload the images to GitHub

GitHub only hosts issue images (`github.com/user-attachments/assets/…`) uploaded through its web page. In the
Chrome extension, open the issue, then:

1. The comment box's "Paste, drop, or click to add files" button creates its file input only when clicked, and
   clicking it opens a native picker. Stop that first with `javascript_tool`:
   ```js
   window.__origClick = HTMLInputElement.prototype.click
   HTMLInputElement.prototype.click = function () {
     if (this.type === 'file') {
       this.id = 'claude-file-input'
       if (!this.isConnected) {
         this.style.display = 'none'
         document.body.appendChild(this)
       }
       return
     }
     return window.__origClick.call(this)
   }
   ;[...document.querySelectorAll('button')]
     .find((b) => /Paste, drop, or click to add files/.test(b.textContent))
     .click()
   ```
2. `find` the hidden file input, then `file_upload` the PNGs to it.
3. Wait a few seconds, then read the comment textarea's value: one `<img … src="https://github.com/user-attachments/assets/…">`
   per file. Restore `HTMLInputElement.prototype.click = window.__origClick`.
4. **Don't post the comment.** Clear the box (click it, cmd+a, Delete) so no draft stays behind, and close the tab.

## 5. Publish

The repo is the user's personal one: run `gh` as `andriyor` with `GH_TOKEN=$(gh auth token -u andriyor)` and
check `gh api user --jq .login` first.

- **Some screenshots retaken:** edit the latest screenshots issue in place: `gh issue view <n> --json body`, swap
  the changed image URLs and their descriptions, `gh issue edit <n> --body-file …`.
- **All of them retaken:** open a new issue "Screenshots (added YYYY-MM-DD)" in the same format, saying they replace
  those in the previous one, and update the README line that names the issue and the date.

Then point the README's image links at the new URLs, with alt text describing what each now shows, and run
`pnpm exec prettier --write README.md`.

## 6. Clean up

Stop the demo servers (`lsof -tiTCP:3140 -sTCP:LISTEN | xargs kill`, same for 5180). The scratch files can stay.
Report which screenshots changed, the issue link, and that nothing was committed until the user asks.
