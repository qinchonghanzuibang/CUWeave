# Upstream audit summary

Before implementation, CUWeave reviewed three independent CUHK planning projects as architectural
research:

| Project                     | Repository                                               | License  | Audited revision                           |
| --------------------------- | -------------------------------------------------------- | -------- | ------------------------------------------ |
| Another CUHK Course Planner | https://github.com/EagleZhen/another-cuhk-course-planner | AGPL-3.0 | `6c9ea314ff5595dd90a88bbbdae8d286408d85f3` |
| CUtopia                     | https://github.com/cutopia-labs/CUtopia                  | MIT      | `0934704c2d74f625d68627c96d9f6a0298e67e8e` |
| Queuesis                    | https://github.com/Aplkalex/Queuesis                     | AGPL-3.0 | `bc1e9b61509c82118d3bf5ed12593a70755738b0` |

The audit supported three long-term conclusions: preserve an adapter boundary around external
course data; keep planner rules framework-independent and teaching-date aware; and use a
relational, offering-specific model for future reviews and academic history. Upstream user
interfaces are inspiration only and CUWeave branding and design must remain independent.

The detailed audit was an external pre-implementation planning record and is not a document in
this repository. This summary is intentionally self-contained and does not link to an unavailable
local planning artifact.

Milestone 0A incorporates **no upstream source code, fixtures, assets, branding, or academic data**.
Reviewing a repository does not authorize reuse. Any future adaptation requires a recorded
classification, license compliance, file-level attribution where appropriate, and an update to
`THIRD_PARTY_NOTICES.md` before merge.
