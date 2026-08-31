const test = require('node:test');
const assert = require('node:assert/strict');
const RiceModel = require('../RiceModel.js');

const widgets = [
  { id: 'omarchy.menu', section: 'left', x: 8, y: 0, width: 27, height: 26, visible: true, itemVisible: true },
  { id: 'omarchy.workspaces', section: 'left', x: 35, y: 0, width: 106, height: 26, visible: true, itemVisible: true },
  { id: 'omarchy.clock', section: 'center', x: 686, y: 0, width: 68, height: 26, visible: true, itemVisible: true },
  { id: 'omarchy.weather', section: 'center', x: 754, y: 0, width: 21, height: 26, visible: true, itemVisible: true },
  { id: 'omarchy.agents', section: 'right', x: 1139, y: 0, width: 0, height: 0, visible: false, itemVisible: false },
  { id: 'omarchy.audio', section: 'right', x: 1351, y: 0, width: 27, height: 26, visible: true, itemVisible: true },
  { id: 'io.github.jcarcinogen.rice-bar', section: 'right', x: 1378, y: 0, width: 27, height: 26, visible: true, itemVisible: true }
];

test('normalizes every selectable chrome preset and safely falls back to islands', () => {
  assert.equal(RiceModel.normalizePreset('omarchy'), 'omarchy');
  assert.equal(RiceModel.normalizePreset('PILLS'), 'pills');
  assert.equal(RiceModel.normalizePreset(' Glass '), 'islands');
  assert.equal(RiceModel.normalizePreset('MATERIAL'), 'material');
  assert.equal(RiceModel.normalizePreset('outline'), 'outline');
  assert.equal(RiceModel.normalizePreset('rail'), 'rail');
  assert.equal(RiceModel.normalizePreset('bracket'), 'bracket');
  assert.equal(RiceModel.normalizePreset('glow'), 'glow');
  assert.equal(RiceModel.normalizePreset('powerline'), 'powerline');
  assert.equal(RiceModel.normalizePreset('mono'), 'mono');
  assert.equal(RiceModel.normalizePreset(' minimal '), 'minimal');
  assert.equal(RiceModel.normalizePreset('Default'), 'omarchy');
  assert.equal(RiceModel.normalizePreset('stock'), 'omarchy');
  assert.equal(RiceModel.normalizePreset('unknown'), 'islands');
  assert.equal(RiceModel.normalizePreset(null), 'islands');
});

test('contrast helpers identify weak theme separation and choose a distinct surface', () => {
  assert.equal(RiceModel.contrastRatio('#1f1f28', '#dcd7ba') > 7, true);
  assert.equal(RiceModel.contrastRatio('#dcd7ba', '#c8c093') < 2, true);
  assert.equal(RiceModel.needsContrastSurface('#dcd7ba', '#c8c093', '#dcd7ba'), true);
  assert.equal(RiceModel.needsContrastSurface('#1f1f28', '#dcd7ba', '#dcd7ba'), false);
  assert.equal(RiceModel.contrastSurface('#dcd7ba', '#c8c093', '#dcd7ba'), '#000000');
  assert.equal(RiceModel.contrastSurface('#1f1f28', '#dcd7ba', '#dcd7ba'), '#1f1f28');
  assert.equal(RiceModel.contrastColor('#dcd7ba', '#7e9cd8', '#1f1f28'), '#dcd7ba');
  assert.equal(RiceModel.contrastColor('#363646', '#dcd7ba', '#1f1f28'), '#dcd7ba');
});

test('readable foreground chooses the strongest theme-compatible contrast', () => {
  assert.equal(RiceModel.readableForeground('#1f1f28', '#1f1f28', '#dcd7ba'), '#dcd7ba');
  assert.equal(RiceModel.readableForeground('#dcd7ba', '#dcd7ba', '#1f1f28'), '#1f1f28');
  for (const surface of ['#777777', '#808080', '#888888']) {
    const foreground = RiceModel.readableForeground(surface, '#ffffff', surface);
    assert.equal(RiceModel.contrastRatio(foreground, surface) >= 4.5, true, surface);
  }
  assert.equal(RiceModel.contrastRatio(
    RiceModel.readableForeground('#dcd7ba', '#c8c093', '#1f1f28'), '#dcd7ba') >= 4.5, true);
});

test('composite contrast plan covers the actual translucent surface over hostile wallpapers', () => {
  const requested = RiceModel.visibleAlpha(20, 0.32);
  const surface = '#1f1f28';
  const plan = RiceModel.readableCompositePlan(
    [surface], requested, '#dcd7ba', '#1f1f28', 4.5);

  assert.equal(plan.alpha > requested, true);
  for (const wallpaper of ['#000000', '#ffffff']) {
    const painted = RiceModel.compositeColor(surface, wallpaper, plan.alpha);
    assert.equal(RiceModel.contrastRatio(plan.foreground, painted) >= 4.5, true,
      `${plan.foreground} must remain readable over ${wallpaper}`);
  }
});

test('visible alpha preserves adjustment while enforcing wallpaper-safe contrast', () => {
  assert.equal(Math.round(RiceModel.visibleAlpha(20, 0.32) * 1000), 456);
  assert.equal(Math.round(RiceModel.visibleAlpha(70, 0.32) * 1000), 796);
  assert.equal(RiceModel.visibleAlpha(100, 0.32), 1);
  assert.equal(RiceModel.visibleAlpha(0, 0.32), 0.32);
});

test('paint recipes keep geometry separate from visual decoration', () => {
  assert.equal(RiceModel.paintRecipe('glass').decoration, 'surface');
  assert.equal(RiceModel.paintRecipe('pills').geometry, 'widgets');
  assert.equal(RiceModel.paintRecipe('rail').decoration, 'rail');
  assert.equal(RiceModel.paintRecipe('bracket').fill, 'none');
  assert.equal(RiceModel.paintRecipe('powerline').radius, 'none');
  assert.equal(RiceModel.paintRecipe('unknown').decoration, 'surface');
});

test('rounded surface styles honor the user-adjustable per-style radius', () => {
  for (const preset of ['islands', 'pills', 'material', 'outline', 'glow', 'mono']) {
    assert.equal(RiceModel.paintRecipe(preset).radius, 'user');
  }
  for (const preset of ['omarchy', 'rail', 'bracket', 'powerline', 'minimal']) {
    assert.equal(RiceModel.paintRecipe(preset).radius, 'none');
  }
});

test('every style has inspiration-based appearance defaults', () => {
  assert.deepEqual(RiceModel.styleDefaults('omarchy'), { opacity: 100, radius: 0, gap: 0, border: false });
  assert.deepEqual(RiceModel.styleDefaults('islands'), { opacity: 92, radius: 12, gap: 4, border: true });
  assert.deepEqual(RiceModel.styleDefaults('pills'), { opacity: 90, radius: 18, gap: 3, border: true });
  assert.deepEqual(RiceModel.styleDefaults('material'), { opacity: 92, radius: 20, gap: 8, border: false });
  assert.deepEqual(RiceModel.styleDefaults('glass'), { opacity: 92, radius: 12, gap: 4, border: true });
  assert.deepEqual(RiceModel.styleDefaults('outline'), { opacity: 20, radius: 14, gap: 6, border: true });
  assert.deepEqual(RiceModel.styleDefaults('rail'), { opacity: 60, radius: 0, gap: 4, border: false });
  assert.deepEqual(RiceModel.styleDefaults('bracket'), { opacity: 20, radius: 0, gap: 8, border: true });
  assert.deepEqual(RiceModel.styleDefaults('glow'), { opacity: 82, radius: 16, gap: 8, border: true });
  assert.deepEqual(RiceModel.styleDefaults('powerline'), { opacity: 92, radius: 0, gap: 6, border: true });
  assert.deepEqual(RiceModel.styleDefaults('mono'), { opacity: 96, radius: 2, gap: 3, border: true });
  assert.deepEqual(RiceModel.styleDefaults('minimal'), { opacity: 55, radius: 0, gap: 2, border: false });
});

test('switching styles saves the current profile and loads unseen style defaults', () => {
  const next = RiceModel.switchPreset({
    preset: 'islands', opacity: 84, radius: 10, gap: 5, border: false
  }, 'outline');
  assert.deepEqual(RiceModel.snapshot(next), {
    preset: 'outline', opacity: 20, radius: 14, gap: 6, border: true
  });
  assert.deepEqual(next.profiles.islands, {
    opacity: 84, radius: 10, gap: 5, border: false
  });
});

test('user adjustments are saved per style and restored on return', () => {
  let settings = RiceModel.switchPreset({ preset: 'islands' }, 'outline');
  settings = RiceModel.updateAppearance(settings, { opacity: 64, radius: 21, gap: 11, border: false });
  settings = RiceModel.switchPreset(settings, 'mono');
  assert.deepEqual(RiceModel.snapshot(settings), {
    preset: 'mono', opacity: 96, radius: 2, gap: 3, border: true
  });
  settings = RiceModel.switchPreset(settings, 'outline');
  assert.deepEqual(RiceModel.snapshot(settings), {
    preset: 'outline', opacity: 64, radius: 21, gap: 11, border: false
  });
});

test('preset-only host edits load the target profile without overwriting it', () => {
  let settings = RiceModel.switchPreset({ preset: 'islands' }, 'outline');
  settings = RiceModel.updateAppearance(settings, { opacity: 64, radius: 21, gap: 11, border: false });
  settings = RiceModel.switchPreset(settings, 'material');
  settings = { ...settings, preset: 'outline' };
  assert.deepEqual(RiceModel.snapshot(settings), {
    preset: 'outline', opacity: 64, radius: 21, gap: 11, border: false
  });
  settings = RiceModel.switchPreset(settings, 'mono');
  assert.deepEqual(settings.profiles.outline, {
    opacity: 64, radius: 21, gap: 11, border: false
  });
  assert.deepEqual(settings.profiles.material, {
    opacity: 92, radius: 20, gap: 8, border: false
  });
});

test('active top-level values override a stale saved profile', () => {
  const settings = {
    preset: 'outline', opacity: 76, radius: 17, gap: 9, border: false,
    profiles: { outline: { opacity: 60, radius: 8, gap: 2, border: true } }
  };
  assert.deepEqual(RiceModel.snapshot(settings), {
    preset: 'outline', opacity: 76, radius: 17, gap: 9, border: false
  });
  const next = RiceModel.switchPreset(settings, 'mono');
  assert.deepEqual(next.profiles.outline, {
    opacity: 76, radius: 17, gap: 9, border: false
  });
});

test('resetting a style removes its saved profile and restores its defaults', () => {
  let settings = RiceModel.switchPreset({ preset: 'islands' }, 'material');
  settings = RiceModel.updateAppearance(settings, { opacity: 72, radius: 7, gap: 1, border: true });
  settings = RiceModel.resetPreset(settings);
  assert.deepEqual(RiceModel.snapshot(settings), {
    preset: 'material', opacity: 92, radius: 20, gap: 8, border: false
  });
  assert.equal(settings.profiles.material, undefined);
});

test('legacy Glass settings migrate to Islands without retaining a selectable Glass profile', () => {
  const migrated = RiceModel.switchPreset({
    preset: 'glass', opacity: 76, radius: 17, gap: 9, border: false,
    profileVersion: 1, activeProfile: 'glass',
    profiles: { glass: { opacity: 64, radius: 18, gap: 8, border: true } }
  }, 'islands');
  assert.deepEqual(RiceModel.snapshot(migrated), {
    preset: 'islands', opacity: 76, radius: 17, gap: 9, border: false
  });
  assert.equal(migrated.profiles.glass, undefined);
  assert.equal(RiceModel.PRESETS.includes('glass'), false);
});

test('normalizes bounded appearance settings', () => {
  assert.deepEqual(RiceModel.snapshot({ preset: 'pills', opacity: 250, radius: -3, gap: 99 }), {
    preset: 'pills', opacity: 100, radius: 0, gap: 24, border: true
  });
  assert.deepEqual(RiceModel.snapshot({ preset: 'omarchy', opacity: 0, radius: 12, gap: 4, border: false }), {
    preset: 'omarchy', opacity: 20, radius: 12, gap: 4, border: false
  });
});

test('filters hidden widgets but keeps every visible bar control in the chrome bounds', () => {
  assert.deepEqual(
    RiceModel.visibleWidgets(widgets).map(item => item.id),
    ['omarchy.menu', 'omarchy.workspaces', 'omarchy.clock', 'omarchy.weather', 'omarchy.audio', 'io.github.jcarcinogen.rice-bar']
  );
});

test('finds the controller settings wherever Omarchy stores the enabled mixed-kind plugin', () => {
  const id = 'io.github.jcarcinogen.rice-bar';
  assert.deepEqual(RiceModel.findEntry({
    bar: { layout: { left: [], center: [], right: [{ id, preset: 'pills' }] } },
    plugins: [{ id, preset: 'minimal' }]
  }, id), { id, preset: 'pills' });
  assert.deepEqual(RiceModel.findEntry({ plugins: [{ id, preset: 'minimal' }] }, id), { id, preset: 'minimal' });
  assert.deepEqual(RiceModel.findEntry({}, id), {});
});

test('trims empty leading space before the right tray chevron', () => {
  const right = [
    { id: 'omarchy.tray', section: 'right', x: 1000, y: 0, width: 210, height: 26, visible: true, itemVisible: true,
      leaves: [{ id: 'omarchy.tray.0', section: 'right', x: 1128, y: 0, width: 27, height: 26, visible: true, itemVisible: true }] },
    { id: 'omarchy.audio', section: 'right', x: 1155, y: 0, width: 27, height: 26, visible: true, itemVisible: true }
  ];
  const rect = RiceModel.islandRects(right, 8)[0];
  assert.deepEqual(rect, { key: 'right', x: 1120, y: -8, width: 98, height: 42 });
});

test('builds one padded island per occupied stock section', () => {
  assert.deepEqual(RiceModel.islandRects(widgets, 4), [
    { key: 'left', x: 4, y: -4, width: 141, height: 34 },
    { key: 'center', x: 682, y: -4, width: 97, height: 34 },
    { key: 'right', x: 1347, y: -4, width: 62, height: 34 }
  ]);
});

test('builds a capsule for each visible stock widget', () => {
  assert.deepEqual(RiceModel.pillRects(widgets, 2).map(rect => rect.key), [
    'omarchy.menu', 'omarchy.workspaces', 'omarchy.clock', 'omarchy.weather', 'omarchy.audio', 'io.github.jcarcinogen.rice-bar'
  ]);
});

test('Pills balances only the final horizontal Omarchy menu capsule', () => {
  const pair = [
    { id: 'omarchy.menu', section: 'left', x: 8, y: 0, width: 27, height: 26, visible: true, itemVisible: true },
    { id: 'omarchy.workspaces', section: 'left', x: 35, y: 0, width: 106, height: 26, visible: true, itemVisible: true }
  ];
  const separated = RiceModel.separateRects(RiceModel.pillRects(pair, 1, null, 'horizontal'), 'horizontal', 2);
  const balanced = RiceModel.balanceMenuPill(separated, 'horizontal');
  assert.deepEqual(separated, [
    { key: 'omarchy.menu', x: 7, y: -1, width: 27, height: 28 },
    { key: 'omarchy.workspaces', x: 36, y: -1, width: 106, height: 28 }
  ]);
  assert.deepEqual(balanced, [
    { key: 'omarchy.menu', x: 11, y: -1, width: 23, height: 28 },
    separated[1]
  ]);
  assert.deepEqual(RiceModel.balanceMenuPill(separated, 'vertical'), separated);
});

test('slot-sized tray leaves stay roughly square so grouped rows do not count', () => {
  assert.equal(RiceModel.isSlotSized(27, 26, 26), true);
  assert.equal(RiceModel.isSlotSized(54, 26, 26), false);
  assert.equal(RiceModel.isSlotSized(12, 12, 26), false);
  assert.equal(RiceModel.isSlotSized(16, 16, 26), false);
});

test('pills split a tray widget into one capsule per visible tray icon', () => {
  const tray = {
    id: 'omarchy.tray',
    section: 'right',
    x: 1112,
    y: 0,
    width: 81,
    height: 26,
    visible: true,
    itemVisible: true,
    leaves: [
      { id: 'omarchy.tray.0', x: 1112, y: 0, width: 27, height: 26, visible: true, itemVisible: true, section: 'right' },
      { id: 'omarchy.tray.dup', x: 1118, y: 5, width: 16, height: 16, visible: true, itemVisible: true, section: 'right' },
      { id: 'omarchy.tray.1', x: 1139, y: 0, width: 27, height: 26, visible: true, itemVisible: true, section: 'right' },
      { id: 'omarchy.tray.2', x: 1166, y: 0, width: 27, height: 26, visible: true, itemVisible: true, section: 'right' }
    ]
  };
  assert.deepEqual(RiceModel.pillRects([tray, widgets[5]], 2).map(rect => rect.key), [
    'omarchy.tray.0', 'omarchy.tray.1', 'omarchy.tray.2', 'omarchy.audio'
  ]);
  assert.deepEqual(RiceModel.islandRects([tray, widgets[5]], 4).map(rect => rect.key), ['right']);
});

test('separates padded section rectangles that would otherwise touch or overlap', () => {
  assert.deepEqual(RiceModel.separateRects([
    { key: 'center', x: 0, y: 380, width: 26, height: 190 },
    { key: 'right', x: 0, y: 566, width: 26, height: 330 }
  ], 'vertical', 2), [
    { key: 'center', x: 0, y: 380, width: 26, height: 187 },
    { key: 'right', x: 0, y: 569, width: 26, height: 327 }
  ]);
});

test('minimal preset produces inner-edge accent rules for horizontal and vertical bars', () => {
  const rects = RiceModel.islandRects(widgets, 2, 'io.github.jcarcinogen.rice-bar');
  assert.deepEqual(RiceModel.accentRects(rects, 'top', 2)[0], {
    key: 'left', x: 6, y: 26, width: 137, height: 2
  });
  assert.deepEqual(RiceModel.accentRects([{ key: 'left', x: 0, y: 8, width: 26, height: 100 }], 'left', 2)[0], {
    key: 'left', x: 24, y: 10, width: 2, height: 96
  });
});
