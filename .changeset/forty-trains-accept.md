---
"@abizzle/changesets-assemble-release-plan": minor
"@abizzle/changesets-apply-release-plan": minor
"@abizzle/changesets-changelog-github": minor
"@abizzle/changesets-changelog-git": minor
"@abizzle/changesets-config": minor
"@abizzle/changesets-types": minor
---

Add support for single changelog fixed package groups.

Optionally supply an object as a fixed package group entry like so:

```json
{
  "fixed": [
    {
      "group": ["@changesets/button", "@changesets/theme"],
      "changelog": "CHANGELOG.md",
      "name": "UI Packages"
    }
  ]
}
```

This will create/update a single changelog at `<projectRoot>/CHANGELOG.md` with changelog entries for `@changesets/button` and `@changesets/theme` under the title "UI Packages".
