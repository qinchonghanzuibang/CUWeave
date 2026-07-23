# README media guide

This guide keeps CUWeave’s repository media accurate, reproducible, and safe to publish. The
current PNG files in `docs/assets/readme/` are genuine captures of the signed-out public
application. Refresh them when the visual system or representative course data changes.

## Current asset map

| File                   | Intended state                                                  | Target size      |
| ---------------------- | --------------------------------------------------------------- | ---------------- |
| `demo-cover.png`       | Populated weekly planner; primary video poster                  | 1600 × 900       |
| `course-discovery.png` | `/courses?q=IERG` with several results                          | 1440 × 900       |
| `course-detail.png`    | `/courses/IERG5310` with section and meeting context            | 1440 × 900       |
| `weekly-planner.png`   | Populated Monday–Sunday grid with the complete 08:00–23:00 axis | About 1152 × 824 |
| `mobile-planner.png`   | Populated `/planner` at a modern phone viewport                 | 390 × 844        |

The main README deliberately omits `mobile-planner.png`: keep it available for future layouts, but
only add it when the static crop clearly shows useful timetable content.

## Capture standard

- Use the public application and signed-out routes whenever possible.
- Use a fresh browser context at 100% zoom, light color scheme, `en-HK` locale, and
  `Asia/Hong_Kong` time zone.
- Wait for the page’s main content and self-hosted fonts before capturing.
- Use 1440 × 900 for desktop screenshots and 390 × 844 for mobile. Capture the primary poster at
  1600 × 900.
- Hide browser chrome. Keep the pointer outside the captured area and avoid hover, focus, loading,
  cookie, debug, dialog, and scrollbar states.
- Do not alter or seed the public database. Build an anonymous planner through the normal “Add to
  planner” actions; its state stays in the capture browser.
- Never show an email address, account menu, schedule name, share token, review draft, moderation
  queue, credentials, OnePass information, student ID, transcript, or browser profile.
- Recheck every selected course and meeting against the public page immediately before capture.
  If a sample course becomes unavailable or changes term, choose a similarly clear current course
  instead of forcing the old composition.

## Recommended 45–60 second demo

Record at 1600 × 900, 30 fps, 100% browser zoom, with browser chrome hidden. Use deliberate cursor
movement, pause briefly after each navigation, and avoid circling or rapidly scrubbing across the
screen.

Suggested storyboard:

1. **0–4 s — Home:** open `https://cuweave.org` and hold on the product introduction.
2. **4–10 s — Discover:** open `/courses`, search for `IERG`, and show several populated results.
3. **10–17 s — Course details:** open `/courses/IERG5310`; pause on its title, offering, section,
   meetings, teaching dates, and instructor context.
4. **17–22 s — Start a plan:** use “Add to planner” on a current IERG5310 section.
5. **22–31 s — Build the week:** add current compatible sections for IERG5470 and ENGG5402. Verify
   their times on the public course pages immediately before recording.
6. **31–41 s — Weekly timetable:** open `/planner`; show the selected academic term and the
   meetings positioned at their actual times. Keep the grid free of dialogs.
7. **41–47 s — Meeting detail:** open one meeting card briefly, show its course, time, room, and
   teaching dates, then close it.
8. **47–53 s — Planning feedback:** show confirmed or uncertain conflict wording only if the
   chosen live sections produce a clear, accurate state. Otherwise skip this beat.
9. **53–60 s — Finish:** return to the completed timetable and end with `cuweave.org` visible in a
   short title card or clean browser-chrome frame.

The core flow is fully anonymous. Favorites, named cloud schedules, and read-only share creation
require an eligible signed-in account and should be omitted from the default recording. If a later
recording includes them, use a dedicated non-personal demonstration account and crop or mask the
account menu, email address, schedule names, and share tokens.

## Recording and export on macOS

- **QuickTime Player:** simplest option for a clean screen recording; crop to the fixed browser
  content area afterward.
- **OBS Studio:** best for locking the canvas to 1600 × 900 and hiding browser chrome during
  capture.
- **ScreenFlow:** useful when the maintainer wants careful cursor smoothing and a final title card.

Export the full demo as H.264 MP4 at 1600 × 900, 30 fps, with no audio unless narration is
deliberately added. Use a moderate web bitrate and inspect the exported file at 100% size for text
clarity. A frame on the completed weekly timetable is the recommended thumbnail; export that frame
as `docs/assets/readme/demo-cover.png`.

Host the MP4 on a stable public location that GitHub can open. In `README.md`, replace only the
`href="https://cuweave.org"` on the primary `demo-cover.png` anchor with the final demo URL. Keep
the poster filename and alt text in place.

## Optional 15–20 second loop

A short silent loop can be:

1. Search `IERG`.
2. Open IERG5310.
3. Add one section.
4. Cut to the populated weekly timetable.
5. Hold for two seconds, then loop.

Export as animated WebP when repository and GitHub rendering support is acceptable; use GIF only
when compatibility matters more than size. Aim for fewer than 8 MB, reduce the frame rate before
reducing legibility, and avoid rapid cursor movement. The static `demo-cover.png` should remain the
primary README media whenever the animation would be large, distracting, or slow on mobile.

## Refresh checklist

1. Confirm the selected public routes return populated, non-sensitive states.
2. Recreate the planner in a fresh anonymous browser context.
3. Capture at the exact viewports above.
4. Inspect every image at original size for clipping, scrollbars, focus rings, personal data, and
   stale course information.
5. Optimize PNGs losslessly or with visually indistinguishable compression.
6. Replace files in place so README paths remain stable.
7. Preview the README in GitHub light and dark themes and verify all image alt text.
