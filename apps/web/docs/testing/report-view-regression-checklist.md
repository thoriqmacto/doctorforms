# Report View Regression Checklist

Use this checklist after changes to report rendering or toolbar actions.

## Edit report toolbar

- [ ] Open `/reports/{id}/edit`.
- [ ] Verify **View PDF** appears in section controls.
- [ ] Verify **Print** is not shown in section controls.
- [ ] Verify **Last refreshed** text is not shown.
- [ ] Click **View PDF** and verify URL follows `/reports/{id}?mode=pdf`.

## Report mode routing

- [ ] Open `/reports/{id}?mode=html` and verify HTML renders.
- [ ] Open `/reports/{id}?mode=pdf` and verify PDF mode renders.
- [ ] Open `/reports/{id}?mode=form` and verify Form mode renders.
- [ ] Open `/reports/{id}?mode=unknown` and verify fallback to HTML mode.

## PDF/HTML structure parity

- [ ] Confirm findings groups (`findings_*`) are merged into a single "Findings" section in HTML view.
- [ ] Generate PDF and confirm findings groups are merged into the same single "Findings" section there as well.
