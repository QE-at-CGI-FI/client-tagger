import { chromium } from '@playwright/test'

// Run with: node tests/cleanup-orphaned-tags.js
// Removes tags from the global tag list and groups if no client is using them.

const BASE_URL = 'http://localhost:5173'
const STORAGE_KEY = 'client-tagger-data'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(BASE_URL)

const result = await page.evaluate((key) => {
  const raw = localStorage.getItem(key)
  if (!raw) return { error: 'No data found in localStorage' }

  const data = JSON.parse(raw)
  const usedTags = new Set(data.clients.flatMap((c) => c.tags))

  const orphans = data.tags.filter((t) => !usedTags.has(t))
  if (orphans.length === 0) return { removed: [] }

  data.tags = data.tags.filter((t) => usedTags.has(t))
  data.tagGroups = data.tagGroups.map((g) => ({
    ...g,
    tags: g.tags.filter((t) => usedTags.has(t)),
  }))

  localStorage.setItem(key, JSON.stringify(data))
  return { removed: orphans }
}, STORAGE_KEY)

if (result.error) {
  console.error('Error:', result.error)
} else if (result.removed.length === 0) {
  console.log('No orphaned tags found.')
} else {
  console.log('Removed orphaned tags:', result.removed.join(', '))
}

await browser.close()
