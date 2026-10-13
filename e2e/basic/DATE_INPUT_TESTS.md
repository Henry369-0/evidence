# DateInput calendar-date regressions

`pages/date-input-regression.md` is a data-free fixture for `tests/date-input.spec.js`. The tests cover UTC, Asia/Shanghai, and America/New_York, including valid defaults, user selection, changing bounds, invalid dates, range presets, and a stored calendar date supplied as the default after a remount. The calendar must show the default's month and selected day, keep user selection and highlighting on the same day even when that day is clicked again, and mark both preset and user-picked range endpoints. The input store is not made into persistent storage by this change; the application must supply a saved value when it wants to restore one.

Use the repository's normal dependency and e2e build setup, then run the focused suite from `e2e/basic`:

All 14 documented range presets retain their calendar-period calculations and labels, and recalculate when the data bounds change. For example, `Year to Date` ends at the calendar year's end and `Month to Date` ends at the month's end, even when loaded data stops earlier; the distinct `Year to Today` and `Month to Today` presets end at the latest data date. Manual selections continue to use the input bounds.

```shell
pnpm exec playwright test tests/date-input.spec.js --project=chromium
```

For an already running dev server, use the same `DEV` setup described by the shared e2e configuration. Calendar selections are stored as `YYYY-MM-DD` calendar strings. Query timestamps continue to use the existing date formatting helper.
