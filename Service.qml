import QtQuick
import Quickshell.Io
import qs.Commons
import "RiceModel.js" as RiceModel
import "LooksModel.js" as LooksModel

// One settings/IPC owner. Visual adapters belong to the existing stock windows.
Item {
  id: root
  property var shell: null
  property var manifest: null
  property string omarchyPath: ""
  readonly property string pluginId: "io.github.jcarcinogen.rice-bar"
  // Host 4.0.4 may publish its cloned shell API before barConfig bindings settle.
  // Use the owning widget's injected settings, then update synchronously on save.
  property var settingsState: null
  readonly property var pluginEntry: settingsState || RiceModel.findEntry(shell ? shell.barConfig : null, pluginId)
  readonly property var live: RiceModel.snapshot(pluginEntry)
  readonly property string preset: live.preset
  readonly property bool reducedMotion: pluginEntry.reducedMotion !== false
  readonly property bool showIcon: pluginEntry.showIcon !== false
  readonly property var savedLooks: LooksModel.normalizeLooks(pluginEntry)
  readonly property string paletteKey: LooksModel.themeKey([String(Color.bar.background), String(Color.bar.text), String(Color.accent)])
  property var widgets: []
  property var undoStack: []
  property var redoStack: []
  property string lastError: ""
  property string lastPalette: ""
  property int revision: 0
  property double lastEditTime: 0
  property string lastEditKind: ""

  function receiveSettings(settings) {
    if(settings && typeof settings === "object") {
      var next=RiceModel.mergeSettings(settings,{id:pluginId})
      if(JSON.stringify(next)!==JSON.stringify(settingsState))settingsState=next
    }
  }
  function attach(widget) {
    if (widgets.indexOf(widget) < 0) widgets = widgets.concat([widget])
    receiveSettings(widget.settings)
  }
  function detach(widget) { widgets = widgets.filter(function(w) { return w && w !== widget }) }
  function persist(next, history, kind) {
    if (!shell || typeof shell.updateEntryInline !== "function") { lastError="Settings API unavailable"; return false }
    var before=JSON.parse(JSON.stringify(pluginEntry))
    if(JSON.stringify(next)===JSON.stringify(before)) return true
    if(shell.updateEntryInline(pluginId,next)!==true) { lastError="Omarchy could not save Rice Bar settings"; return false }
    settingsState=RiceModel.mergeSettings(next,{id:pluginId})
    if(history!==false) {
      var now=Date.now()
      if(kind!=="appearance" || lastEditKind!==kind || now-lastEditTime>750)
        undoStack=undoStack.concat([before]).slice(-30)
      redoStack=[]; lastEditTime=now; lastEditKind=kind||""
    }
    lastError=""; revision++; return true
  }
  function selectPreset(value) {
    var p=String(value).toLowerCase()
    if(p!=="default" && p!=="stock" && RiceModel.PRESETS.indexOf(p)<0) {lastError="Unknown style";return false}
    return persist(RiceModel.switchPreset(pluginEntry,p),true,"style")
  }
  function appearance(values) { return persist(RiceModel.updateAppearance(pluginEntry,values),true,"appearance") }
  function preference(key,value) {
    if(["reducedMotion","showIcon","themeFollow"].indexOf(key)<0 || typeof value!=="boolean") return false
    var patch={};patch[key]=value
    return persist(RiceModel.mergeSettings(pluginEntry,patch),true,"preference")
  }
  function resetStyle() { return persist(RiceModel.resetPreset(pluginEntry),true,"reset") }
  function applyLook(value) {
    return persist(RiceModel.updateAppearance(RiceModel.switchPreset(pluginEntry,value.preset),value),true,"look")
  }
  function saveLook(name,id) {
    var result=LooksModel.saveLook(pluginEntry,name,live,id)
    if(!result.ok) {lastError=result.error;return false}
    return persist(result.settings,true,"save")
  }
  function removeLook(id) {
    var result=LooksModel.deleteLook(pluginEntry,id)
    if(!result.ok) {lastError=result.error;return false}
    return persist(result.settings,true,"delete")
  }
  function renameLook(id,name) {
    var result=LooksModel.renameLook(pluginEntry,id,name)
    if(!result.ok) {lastError=result.error;return false}
    return persist(result.settings,true,"rename")
  }
  function importLook(text) {
    var result=LooksModel.importLook(pluginEntry,text)
    if(!result.ok) {lastError=result.error;return false}
    return persist(result.settings,true,"import")
  }
  function exportLook(name) { return LooksModel.exportLook(live,name || "My Rice Bar look") }
  function linkTheme() {
    var result=LooksModel.linkTheme(pluginEntry,paletteKey,live)
    if(!result.ok) {lastError=result.error;return false}
    return persist(RiceModel.mergeSettings(result.settings,{themeFollow:true}),true,"theme")
  }
  function unlinkTheme() {
    var result=LooksModel.unlinkTheme(pluginEntry,paletteKey)
    if(!result.ok) {lastError=result.error;return false}
    return persist(result.settings,true,"theme")
  }
  function followTheme() {
    if(!shell || !paletteKey) return
    if(!lastPalette) {lastPalette=paletteKey;return}
    if(lastPalette===paletteKey) return
    lastPalette=paletteKey
    if(pluginEntry.themeFollow===true) {
      var value=LooksModel.linkedAppearance(pluginEntry,paletteKey)
      if(value) applyLook(value)
    }
  }
  function undo() {
    if(!undoStack.length) return false
    var next=undoStack[undoStack.length-1], current=JSON.parse(JSON.stringify(pluginEntry))
    if(!persist(next,false))return false
    undoStack=undoStack.slice(0,-1);redoStack=redoStack.concat([current]).slice(-30);lastEditKind="";return true
  }
  function redo() {
    if(!redoStack.length) return false
    var next=redoStack[redoStack.length-1], current=JSON.parse(JSON.stringify(pluginEntry))
    if(!persist(next,false))return false
    redoStack=redoStack.slice(0,-1);undoStack=undoStack.concat([current]).slice(-30);lastEditKind="";return true
  }
  function panelAction(action) {
    if(!shell)return false
    if(action==="open")return shell.summon(pluginId,"")
    if(action==="close")return shell.hide(pluginId)
    return shell.toggle(pluginId,"")
  }
  function statusObject() {
    var displays=widgets.filter(function(w){return w}).map(function(w){return w.diagnostics()})
    var count=0,geometries=0
    displays.forEach(function(d){count+=d.surfaceCount;geometries+=d.geometryCount})
    var reason=preset==="omarchy"?"stock-style":!shell?"missing-shell-api":!displays.length?"missing-bar-widget":displays.every(function(d){return !d.supported})?"unsupported-bar":
      displays.every(function(d){return d.stockTransparent})?"stock-transparency":
      displays.every(function(d){return d.hidden})?"bar-hidden":geometries===0?"geometry-unavailable":count===0?"no-painted-surfaces":"ok"
    return {id:pluginId,architecture:"stock-window-chrome",adapter:"omarchy-4-slot-tree-v1",preset:preset,
      shown:count>0,reason:reason,geometryCount:geometries,surfaceCount:count,displays:displays,
      paletteKey:paletteKey,reducedMotion:reducedMotion,showIcon:showIcon,
      savedLookCount:savedLooks.length,canUndo:undoStack.length>0,canRedo:redoStack.length>0,error:lastError}
  }
  onPaletteKeyChanged: themeDebounce.restart()
  Timer { id:themeDebounce;interval:350;onTriggered:root.followTheme() }
  Timer { interval:350;running:true;onTriggered:root.followTheme() }
  IpcHandler {
    target:"rice-bar"
    function ui():string{return JSON.stringify(root.widgets.map(function(w){return w.uiState()}))}
    function status():string{return JSON.stringify(root.statusObject())}
    function style(value:string):string{return root.selectPreset(value)?root.preset:"error: "+root.lastError}
    function open():void{root.panelAction("open")}
    function close():void{root.panelAction("close")}
    function toggle():void{root.panelAction("toggle")}
    function undo():bool{return root.undo()}
    function redo():bool{return root.redo()}
    function save(name:string):bool{return root.saveLook(name,"")}
    function exportLook(name:string):string{return root.exportLook(name)}
    function importLook(text:string):bool{return root.importLook(text)}
    function settings():string{return JSON.stringify(root.pluginEntry)}
  }
}
