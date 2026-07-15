# Planner semantics

- Meeting intervals are half-open: an event ending at 11:00 does not conflict with one beginning at
  11:00.
- Different weekdays do not conflict. Different terms do not conflict.
- Full, reliably parsed teaching-date ranges can establish overlap or non-overlap.
- Date lists without explicit years, TBA values, and unsupported formats remain `unknown`.
- Matching weekday/time with unknown teaching-date overlap is an uncertain conflict, never silently
  ignored.
- TBA meeting times produce separate uncertainty warnings.
- Section identifiers are preserved. Duplicate sections and multiple alternatives of the same
  recognized component are incompatible; unclassified lecture/tutorial/lab pairings remain
  unknown rather than being guessed from their first letter.
- The local schedule stores version `1` plus sorted, unique section UUIDs. Invalid or old browser
  data resets safely to an empty schedule.
