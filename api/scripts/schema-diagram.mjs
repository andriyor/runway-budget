// Writes the schema's Mermaid ER diagram into the README between the schema-diagram markers.
// Run after changing src/db/schema.ts: pnpm --filter api db:diagram
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const readme = new URL('../../README.md', import.meta.url)
const diagram = execFileSync('drizzle-mermaid-generator', ['-d', 'sqlite', '-s', './src/db/schema.ts'], {
  encoding: 'utf8',
}).trim()
const start = '<!-- schema-diagram:start -->'
const end = '<!-- schema-diagram:end -->'
const text = readFileSync(readme, 'utf8')
const [before, rest] = text.split(start)
if (rest === undefined || !rest.includes(end)) throw new Error(`README.md needs ${start} and ${end}`)
writeFileSync(readme, `${before}${start}\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\n${end}${rest.split(end)[1]}`)
