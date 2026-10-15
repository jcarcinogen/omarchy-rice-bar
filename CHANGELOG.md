# Changelog

## 0.5.0 — 2026-10-15

### Added

- Live gallery with 15 choices: stock Default, ten existing finishes, and new **Glass, Pixel, Bevel, and Ribbon** styles.
- Per-style customization, reset, session Undo/Redo, named saved looks, and validated portable JSON import/export.
- Optional theme-palette links, reduced motion, hidden-icon access, and an explicitly installed, reversible command-menu shortcut.
- Runtime diagnostics reporting actual geometry, paint state, contrast, and compatibility conditions.
- Fresh native gallery/control/bar screenshots and original cyberpunk marketplace artwork.

### Fixed

- Omarchy 4.0.4 compatibility after removal of private slot APIs. Decoration now belongs to the existing stock bar window; widgets and input handlers are not replaced.
- Saved-style changes lagging behind the rendered style because of host settings publication order.
- Customization slider dimensions and saved-look dropdown synchronization.
- Readability and paint bounds across horizontal/vertical layouts and light/dark palettes.

### Compatibility

Tested on Omarchy 4.0.4-1 / Quickshell 0.3.1-1. Glass means translucency, not compositor blur. Effective opacity may be raised to protect stock text contrast. The geometry adapter depends on the host's internal visual tree; older and future releases may need separate validation.

On the tested host, free dragging toward another screen edge can fail even with Rice Bar disabled. Change position through the Omarchy menu; double-click transparency works. This release preserves stock gesture handling rather than patching the desktop shell.

See [release verification](REVIEW.md) for automated, native, and owner-confirmed evidence.
