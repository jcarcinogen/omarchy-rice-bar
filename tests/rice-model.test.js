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

test('normalizes known presets and safely falls back to islands', () => {
  assert.equal(RiceModel.normalizePreset('omarchy'), 'omarchy');
  assert.equal(RiceModel.normalizePreset('PILLS'), 'pills');
  assert.equal(RiceModel.normalizePreset(' minimal '), 'minimal');
  assert.equal(RiceModel.normalizePreset('Default'), 'omarchy');
  assert.equal(RiceModel.normalizePreset('stock'), 'omarchy');
  assert.equal(RiceModel.normalizePreset('unknown'), 'islands');
  assert.equal(RiceModel.normalizePreset(null), 'islands');
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
