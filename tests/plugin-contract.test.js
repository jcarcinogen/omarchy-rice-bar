const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function source(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

test('manifest declares a stock-bar overlay with selectable presets', () => {
  const manifest = JSON.parse(source('manifest.json'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.id, 'io.github.jcarcinogen.rice-bar');
  assert.deepEqual(manifest.kinds, ['service', 'bar-widget']);
  assert.equal(manifest.entryPoints.service, 'Service.qml');
  assert.equal(manifest.entryPoints.barWidget, 'BarWidget.qml');
  assert.equal(manifest.barWidget.defaultSection, 'right');
  assert.equal(manifest.barWidget.defaults.preset, 'islands');
  const preset = manifest.barWidget.schema.find(entry => entry.key === 'preset');
  assert.deepEqual(preset.options, ['Omarchy', 'Islands', 'Pills', 'Minimal']);
});

test('service remains an Option A overlay instead of a replacement bar', () => {
  const manifest = JSON.parse(source('manifest.json'));
  assert.equal(manifest.kinds.includes('bar'), false);
  const service = source('Service.qml');
  assert.match(service, /WlrLayer\.Bottom/);
  assert.match(service, /mask:\s*Region\s*\{\s*\}/);
  assert.match(service, /debugBarGeometry|moduleSlots/);
  assert.match(service, /Color\.bar\.background/);
  assert.match(service, /Color\.accent/);
});

test('service imports the Quickshell modules required by its runtime types', () => {
  const service = source('Service.qml');
  assert.match(service, /import Quickshell\.Io/);
  assert.match(service, /import Quickshell\.Wayland/);
});

test('rice transparency is reapplied after stock config updates finish', () => {
  const service = source('Service.qml');
  assert.match(service, /onPresetChanged:\s*Qt\.callLater\(root\.applyBarMode\)/);
  assert.match(service, /onRequestedTransparentChanged\(\)[\s\S]*Qt\.callLater\(root\.applyBarMode\)/);
});

test('stock transparency capture survives a bar rebind', () => {
  const service = source('Service.qml');
  assert.match(service, /onBarChanged:\s*Qt\.callLater\(root\.applyBarMode\)/);
  assert.doesNotMatch(service, /onBarChanged:[\s\S]{0,120}stockStateCaptured\s*=\s*false/);
});

test('visible settings control participates in Rice Bar surface geometry', () => {
  const service = source('Service.qml');
  assert.doesNotMatch(service, /(?:pillRects|islandRects)\([^\n]*pluginId/);
});

test('settings control uses the rice-bowl glyph and never replaces Omarchy branding', () => {
  const rice = '\u{F07EA}';
  const widget = source('BarWidget.qml');
  const panel = source('RicePanel.qml');
  assert.match(widget, /BarIconButton/);
  assert.match(widget, new RegExp(rice));
  assert.match(panel, new RegExp(rice));
  assert.doesNotMatch(widget, /text:\s*["'](?:OMARCHY|Omarchy)["']/);
  assert.doesNotMatch(widget, /moduleName:\s*["']omarchy\./);
});

test('all selectable presets are implemented by the overlay', () => {
  const service = source('Service.qml');
  for (const preset of ['omarchy', 'islands', 'pills', 'minimal']) {
    assert.match(service, new RegExp(`['"]${preset}['"]`));
  }
});
