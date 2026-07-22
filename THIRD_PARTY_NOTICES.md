# Third-party notices

CUWeave incorporates **no source code, fixtures, assets, or branding** from the reviewed upstream
projects below. They informed architectural research, and Fast-track Milestone 1 independently
implements local JSON compatibility with the audited Another Planner data shape.

| Project                     | Repository                                               | License  | Audited revision                           |
| --------------------------- | -------------------------------------------------------- | -------- | ------------------------------------------ |
| Another CUHK Course Planner | https://github.com/EagleZhen/another-cuhk-course-planner | AGPL-3.0 | `6c9ea314ff5595dd90a88bbbdae8d286408d85f3` |
| CUtopia                     | https://github.com/cutopia-labs/CUtopia                  | MIT      | `0934704c2d74f625d68627c96d9f6a0298e67e8e` |
| Queuesis                    | https://github.com/Aplkalex/Queuesis                     | AGPL-3.0 | `bc1e9b61509c82118d3bf5ed12593a70755738b0` |

No third-party license file is included because no portion of their software is copied or closely
ported. Committed tests are independently synthetic. Real academic JSON may be imported from a
separate local checkout for development but is not vendored or redistributed by this repository.

## Development tooling

CUWeave uses `ical.js` under the Mozilla Public License 2.0 in automated tests to parse and validate
generated RFC 5545 calendar files. Its source and license are available from
https://github.com/kewisch/ical.js. It is a development dependency and is not used to generate
calendar data in the browser.
