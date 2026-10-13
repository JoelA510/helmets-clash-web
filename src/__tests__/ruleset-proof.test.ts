// Planted failure: proves the imported ruleset blocks merging a PR whose CI is red (plan M1.6).
// This PR is closed unmerged; the branch is deleted after.
import { expect, it } from 'vitest'

it('fails on purpose', () => {
  expect(1).toBe(2)
})
