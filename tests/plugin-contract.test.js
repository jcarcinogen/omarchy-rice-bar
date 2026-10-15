const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const R=require('../RiceModel.js');const L=require('../LooksModel.js');const root=path.resolve(__dirname,'..');const source=n=>fs.readFileSync(path.join(root,n),'utf8');
test('manifest, gallery and share format expose exactly the same supported styles',()=>{
 const manifest=JSON.parse(source('manifest.json'));assert.deepEqual(manifest.kinds,['service','bar-widget']);
 assert.deepEqual(manifest.barWidget.schema.find(x=>x.key==='preset').options.map(x=>x.toLowerCase()),R.PRESETS);assert.deepEqual(L.STYLES,R.PRESETS);
 for(const style of R.PRESETS)assert.ok(source('RicePanel.qml').includes(`value:"${style}"`));
});
test('no replacement bar, host write escape or second shell process',()=>{
 const all=['Service.qml','BarWidget.qml','RiceChrome.qml','RiceSurface.qml'].map(source).join('\n');
 assert.doesNotMatch(all,/ShellRoot|WlrKeyboardFocus\.Exclusive|moduleSlots|shellConfig|transparentForeground\s*=|bar\.transparent\s*=|foregroundAnimationEnabled\s*=/);
 assert.doesNotMatch(source('RiceChrome.qml'),/MouseArea|TapHandler|PointerHandler|PanelWindow|Process\s*\{/);
 assert.match(source('RiceChrome.qml'),/z:\s*-1000/);assert.match(source('RiceChrome.qml'),/enabled:\s*false/);
});
test('background color override is scoped and restores the original binding',()=>{
 const s=source('RiceChrome.qml');assert.match(s,/target:root\.hostWindow/);assert.match(s,/when:root\.visible/);assert.match(s,/restoreMode:Binding\.RestoreBindingOrValue/);
 assert.match(s,/!stockTransparent/);assert.match(source('BarWidget.qml'),/if\(chrome\)chrome\.destroy\(\)/);
});
test('one service owns settings and IPC, one lazy native panel per widget',()=>{
 assert.match(source('Service.qml'),/shell\.barConfig/);assert.match(source('Service.qml'),/shell\.updateEntryInline/);
 assert.match(source('BarWidget.qml'),/active:false;source:Qt\.resolvedUrl\("RicePanel.qml"\)/);
 assert.match(source('RicePanel.qml'),/manageIpc:false/);assert.match(source('RicePanel.qml'),/KeyboardPanel/);
});
test('runtime and preview share the same geometry decoration renderer and contrast planner',()=>{
 for(const f of ['RiceChrome.qml','RiceStylePreview.qml']){assert.match(source(f),/RiceSurface/);assert.match(source(f),/RiceModel\.fixedForegroundPlan/);assert.match(source(f),/hyprland.active-border/)}
 assert.doesNotMatch(source('RiceSurface.qml'),/MouseArea|TapHandler|Behavior on (x|y|width|height)/);
});
test('gallery labels and imported JSON remain plain text; command launch uses argv',()=>{
 assert.match(source('RicePanel.qml'),/textFormat:TextEdit\.PlainText/);assert.match(source('RiceButton.qml'),/textFormat:Text\.PlainText/);
 assert.match(source('RicePanel.qml'),/menuProcess.command=\["python3"/);assert.doesNotMatch(source('RicePanel.qml'),/bash|sh -c/);
});
test('status is based on attached geometry and actual paint counts, not selected style alone',()=>{
 const s=source('Service.qml');assert.match(s,/shown:count>0/);assert.match(s,/geometry-unavailable/);assert.match(s,/stock-transparency/);assert.match(s,/surfaceCount:count/);
});
test('rice icon and official stock widget identity are preserved',()=>{
 assert.match(source('BarWidget.qml'),/text:"󰟪"/);assert.match(source('RicePanel.qml'),/󰟪  Rice Bar/);assert.doesNotMatch(source('BarWidget.qml'),/moduleName:\s*["']omarchy\./);
});
