# Rice Bar — release verification

## 0.5.1 clipboard repair

The name TextField eagerly retrieved changed clipboard text on the Acer’s installed Qt 6.11.2. A native counting-MIME probe reproduced that read; permanent-read-only TextField and plain TextEdit did not retrieve the payload. Both editable Rice Bar fields now use the same plain TextEdit-based bounded-paste wrapper.

- Private Wayland compositor: two actual RiceTextEditor instances, clipboard offer changes while open and hidden; **zero `wl_data_offer.receive` requests** before paste. The offer provider also recorded no payload reads.
- Production helper against real foreign Wayland offers: small text accepted at both caps; 64 KiB rejected at 4 KiB and 32 KiB caps; delayed offers rejected in approximately 1.54 seconds. No owner clipboard was involved.
- Native offscreen Qt/Quickshell editor tests: **31 assertions passed**, including keyboard routing, selection replacement, Unicode/plain markup, horizontal/multiline caret scrolling, caps, middle-click blocking, and stale-result rejection. Helper doubles exercise UI routing, not end-to-end owner-shell clipboard transfer. One initial fixture run timed out; two subsequent full runs passed.
- Python suites on Acer: **29 tests passed**, including Linux helper-parent-death cleanup.
- `qmllint` exit 0; host-type/unqualified-access warnings remain. Manifest validation passed for candidate and installed directory.
- Node suites: **79 tests passed**.
- Installed 0.5.1 after backing up 0.5.0; shell restart, native panel open/close, file-hash checks and keyboard-layer cleanup passed. The first attempt was correctly blocked by the locked session; testing resumed only after the owner unlocked it.
- **73 live UI checks passed**, covering all gallery cards and contrast, slider keyboard input, saved-look CRUD, JSON import, Undo/Redo, Escape with editor focus, hidden-icon reopening, palette links, and stock clock/audio clicks. The initial visual test correctly observed stock transparency pausing decoration; the fixture was updated to temporarily disable transparency, then restore the exact original shell configuration.
- Protected shell/menu/keybinding file hashes match their pre-deployment values after all testing. Independent source review reported no additional findings.

Reproduce native component tests on Omarchy using `python3 -B tests/run_native_clipboard.py`; the runner uses an isolated offscreen runtime and installed Commons, not the owner clipboard. Private-compositor sources, exact logs, and release evidence are retained in the established Rice Bar release evidence folder. Real input-method composition and physical user typing have not been newly tested.

## 0.5.0 visual release baseline

Tested on **Omarchy 4.0.4-1 / Quickshell 0.3.1-1**, with Hyprland 0.56.2. Native tests ran on a real Omarchy desktop; virtual-pointer input is distinguished from physical owner testing below.

## Automated and native results

| Check | Result |
|---|---|
| Node model, geometry, contrast, import, and source-contract suite | 78 passed |
| Python menu helper safety, JSONC, ownership, and rollback suite | 13 passed |
| Native gallery and interaction sequence | 73 checks passed; rerun for release |
| Native orientation, appearance, palette, and lifecycle matrix | 322 assertions passed; unrestricted edge drag separately documented below |
| Native menu setup/action/removal, control bounds, motion, and process ownership | 11 checks passed |
| Plugin manifest validation | Passed on Omarchy |
| Native qmllint | Exit 0, no errors; host-type/unqualified-access warnings remain |

Native assertion totals include repeated surface-bound checks; they are not counts of unique user journeys. Passing tests are not a guarantee of zero bugs or a security audit.

## Exercised behavior

- Actual pointer selection of every gallery card; saved and rendered preset agreement.
- All 14 decorated styles at top, bottom, left, and right, with positive paint bounds and contrast checks.
- Minimum opacity, maximum radius/spacing, borders on/off, transparency pause/resume, and hide/show.
- Keyboard slider changes, per-style persistence, saved-look CRUD, dropdown selection, valid/invalid imports, Undo/Redo, and Escape with an editor focused.
- Icon hiding with continued IPC access; optional command-menu installation, opening, and exact-content-preserving removal.
- Pointer clicks reaching stock clock/audio panels and keyboard-layer cleanup.
- Live dark/light palette changes and palette-linked looks.
- Temporary second virtual output at fractional scale, output removal, and per-display decoration ownership. This is not a physical hotplug test.
- Default restoration, disable/re-enable, and cold shell restart.
- New publication captures from the running UI, inspected for clipping and personal information. Promotional artwork contains real screenshots, not substitute UI.

## Gesture results and accepted limitation

The owner confirmed that **double-click transparency works** and accepted menu-based bar positioning as sufficient for release.

A separate native pointer matrix tested Rice Bar fully disabled, Default, Pills, and Glass. All four toggled transparency both ways; rendered captures verified the visible change. All four also reproduced failed movement when dragging out toward a side of the screen. Dragging along the top bar to its left end worked, but a vertical follow-up failed, so this is not advertised as a general workaround.

Temporary stock-event tracing received press/release events but no out-of-bar position updates during the failing drag. This identifies the delivery symptom, not which of Omarchy, Qt/Quickshell, or Hyprland owns the underlying defect. No stock shell or compositor files were patched. Use the Omarchy menu to change bar position.

## Architecture and remaining limits

Decoration is an input-disabled child of the existing stock window. It does not reparent widgets, install mouse handlers, create another bar window, change stock text colors, or replace the shell. A scoped Qt binding restores the stock background when decoration stops.

The bounded geometry reader depends on the host's private visual tree. Older host versions, physical monitor hotplug, every third-party widget, lock/unlock, and hardware-specific gestures have not been exhaustively validated. Future Omarchy changes can require an adapter update.

The optional menu helper is user-invoked, standard-library Python. The plugin has no install hook and requires no additional packages on the tested Omarchy installation.

## Reproduce local suites

```bash
node --test tests/*.test.js
python3 -B -m unittest discover -s tests -p 'test_*.py'
omarchy plugin validate .
```

CI runs both Node and Python suites. Native loading, screenshots, pointer interactions, and host lifecycle checks remain necessary beyond these pure-code tests.
