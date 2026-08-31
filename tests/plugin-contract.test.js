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
  assert.deepEqual(preset.options, [
    'Omarchy', 'Islands', 'Pills', 'Material', 'Outline',
    'Rail', 'Bracket', 'Glow', 'Powerline', 'Mono', 'Minimal'
  ]);
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

test('pills collect per-icon tray leaves from the stock overlay', () => {
  const service = source('Service.qml');
  assert.match(service, /omarchy\.tray/);
  assert.match(service, /slotLeaves/);
  assert.match(service, /leaves:/);
  assert.match(service, /var separated = RiceModel\.separateRects\(rects, axis, 2\)[\s\S]{0,180}RiceModel\.balanceMenuPill\(separated, axis\)/);
});

test('all selectable presets are exposed by the panel and delegated to paint recipes', () => {
  const service = source('Service.qml');
  const panel = source('RicePanel.qml');
  assert.match(service, /RiceModel\.paintRecipe\(preset\)/);
  for (const preset of [
    'omarchy', 'islands', 'pills', 'material', 'outline',
    'rail', 'bracket', 'glow', 'powerline', 'mono', 'minimal'
  ]) {
    assert.match(panel, new RegExp(`value:\\s*['"]${preset}['"]`));
  }
});

test('panel and IPC use per-style profiles with a current-style defaults button', () => {
  const service = source('Service.qml');
  const panel = source('RicePanel.qml');
  assert.match(service, /RiceModel\.switchPreset\(pluginEntry,\s*value\)/);
  assert.match(panel, /RiceModel\.switchPreset\(settings,\s*value\)/);
  assert.match(panel, /RiceModel\.updateAppearance\(settings,\s*values\)/);
  assert.match(panel, /RiceModel\.resetPreset\(settings\)/);
  assert.match(panel, /Restore "\s*\+\s*root\.styleLabel\(root\.live\.preset\)\s*\+\s*" defaults/);
  assert.doesNotMatch(panel, /Restore default bar/);
});

test('style dropdown stays synchronized after external preset changes', () => {
  const panel = source('RicePanel.qml');
  assert.match(panel, /Dropdown\s*\{[\s\S]{0,80}id:\s*styleDropdown/);
  assert.match(panel, /Binding\s*\{[\s\S]{0,100}target:\s*styleDropdown[\s\S]{0,100}value:\s*root\.live\.preset/);
});

test('appearance controls are disabled only for the unmodified Default preset', () => {
  const panel = source('RicePanel.qml');
  assert.match(panel, /readonly property bool appearanceControlsEnabled:\s*live\.preset\s*!==\s*["']omarchy["']/);
  assert.equal((panel.match(/enabled:\s*root\.appearanceControlsEnabled/g) || []).length, 4);
});

test('renderer derives adaptive contrast surfaces from reactive Omarchy theme colors', () => {
  const service = source('Service.qml');
  assert.match(service, /RiceModel\.contrastSurface\([\s\S]{0,100}Color\.bar\.background,\s*Color\.bar\.text,\s*Color\.accent\)/);
  assert.match(service, /RiceModel\.visibleAlpha\(root\.live\.opacity,\s*0\.32\)/);
  assert.match(service, /readonly property color adaptiveSurface:/);
  assert.match(service, /readonly property color adaptiveAccent:/);
  assert.match(service, /bar\.transparentForeground\s*=\s*root\.readableForeground/);
  assert.match(service, /RiceModel\.readableForeground\([\s\S]{0,120}adaptiveSurface/);
  assert.match(service, /function onBackgroundChanged\(\)\s*\{\s*root\.useThemeForeground\(\)\s*\}/);
  assert.match(service, /target:\s*Color[\s\S]{0,120}function onAccentChanged\(\)\s*\{\s*root\.useThemeForeground\(\)\s*\}/);
  assert.match(service, /id:\s*sparseBackplates/);
  assert.match(service, /visible:\s*root\.recipe\.decoration\s*===\s*["']rail["'][\s\S]{0,160}bracket[\s\S]{0,160}minimal/);
});

test('every style paint path honors exposed opacity radius and border controls', () => {
  const service = source('Service.qml');
  assert.match(service, /readonly property real opacityFactor:\s*root\.live\.opacity\s*\/\s*100/);
  assert.match(service, /readonly property int powerlineCut:[\s\S]{0,120}root\.live\.radius/);
  assert.match(service, /radius:\s*Math\.min\(root\.live\.radius,\s*rule\s*\/\s*2\)/);
  assert.match(service, /if\s*\(!root\.live\.border\)\s*return\s*["']transparent["']/);
  assert.match(service, /visible:\s*surface\.glow\s*&&\s*root\.live\.border/);
  assert.match(service, /bracketColor:\s*root\.live\.border[\s\S]{0,160}surface\.accentColor[\s\S]{0,160}Color\.bar\.text/);
  assert.match(service, /edgeRuleColor:\s*root\.live\.border[\s\S]{0,160}Color\.bar\.text/);
  assert.doesNotMatch(service, /Math\.max\(0\.(?:68|82),\s*opacity/);
});

test('filled surfaces inset their background inside the visible border', () => {
  const service = source('Service.qml');
  assert.match(service, /id:\s*baseSurface[\s\S]{0,220}color:\s*["']transparent["']/);
  assert.match(service, /id:\s*innerFill[\s\S]{0,180}anchors\.margins:\s*baseSurface\.border\.width/);
  assert.match(service, /id:\s*innerFill[\s\S]{0,220}color:\s*surface\.fillColor/);
  assert.doesNotMatch(service, /id:\s*baseSurface[\s\S]{0,220}color:\s*surface\.fillColor/);
  assert.match(service, /ShapePath\s*\{[\s\S]{0,180}strokeWidth:\s*root\.live\.border\s*\?\s*1\s*:\s*0[\s\S]{0,180}fillColor:\s*surface\.fillColor/);
});

test('overlay samples geometry imperatively instead of binding mapToItem into PanelWindow geometry', () => {
  const service = source('Service.qml');
  assert.doesNotMatch(service, /readonly property var geometry:/);
  assert.doesNotMatch(service, /readonly property var widgetGeometry:\s*root\.geometryForScreen/);
  assert.match(service, /property var widgetGeometry:\s*\[\]/);
  assert.match(service, /onTriggered:\s*riceWindow\.widgetGeometry\s*=\s*root\.geometryForScreen/);
});

test('special styles are passive paint decorations over section geometry', () => {
  const service = source('Service.qml');
  assert.match(service, /RiceModel\.paintRecipe/);
  assert.match(service, /decoration\s*===\s*["']material["']/);
  assert.match(service, /decoration\s*===\s*["']outline["']/);
  assert.match(service, /decoration\s*===\s*["']rail["']/);
  assert.match(service, /decoration\s*===\s*["']bracket["']/);
  assert.match(service, /decoration\s*===\s*["']glow["']/);
  assert.match(service, /decoration\s*===\s*["']powerline["']/);
  assert.match(service, /decoration\s*===\s*["']mono["']/);
  assert.doesNotMatch(service, /WlrKeyboardFocus\.Exclusive|MouseArea|TapHandler/);
});

test('Glass is absent from every selectable and paint source', () => {
  for (const name of ['manifest.json', 'RicePanel.qml', 'Service.qml', 'README.md'])
    assert.doesNotMatch(source(name), /glass/i, name);
});
