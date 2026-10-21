import QtQuick
import qs.Commons
import "RiceModel.js" as RiceModel
import "HostGeometry.js" as HostGeometry

// Visual-only child of the existing bar contentItem. No input handlers, window,
// exclusive zone or widget reparenting. Destroying this restores window color.
Item {
  id: root
  objectName: "rice-bar-chrome"
  property var hostWindow: null
  property var facade: null
  property var service: null
  property var widgetGeometry: []
  property string geometrySignature: ""
  // The cards are re-synced in the frame the host reflows: see check().
  property var slotItems: []
  property double slotExtent: 0
  readonly property var live: service ? service.live : RiceModel.snapshot({})
  readonly property string position: facade ? facade.position : "top"
  readonly property bool vertical: position === "left" || position === "right"
  readonly property bool hidden: !facade || (facade.shell && facade.shell.bar && facade.shell.bar.barHidden === true) || !hostWindow || !hostWindow.visible
  readonly property bool stockTransparent: facade ? facade.transparent === true : false
  readonly property bool supported: facade && facade.shell && facade.shell.barConfig && (!facade.shell.barConfig.id || facade.shell.barConfig.id === "omarchy.bar")
  readonly property bool sampling: supported && !hidden && !stockTransparent && live.preset!=="omarchy"
  readonly property var recipe: RiceModel.paintRecipe(live.preset)
  readonly property color nativeForeground: facade ? facade.foreground : Color.bar.text
  readonly property var contrastPlan: RiceModel.fixedForegroundPlan(RiceModel.styleSurface(Color.bar.background,Color.accent,live.preset),nativeForeground,RiceModel.visibleAlpha(live.opacity,0.32))
  readonly property color safeSurface: contrastPlan.surface
  readonly property color surfaceColor: Qt.rgba(safeSurface.r,safeSurface.g,safeSurface.b,contrastPlan.alpha)
  readonly property color themeBorderColor: Color.flatColor(Color.pick("hyprland.active-border",Color.accent),Color.accent)
  readonly property var paintRects: {
    var axis=vertical?"vertical":"horizontal"
    var rects=recipe.geometry==="none"?[]:recipe.geometry==="widgets"
      ?RiceModel.pillRects(widgetGeometry,Math.max(1,Math.floor(live.gap/2)),null,axis)
      :RiceModel.islandRects(widgetGeometry,live.gap)
    var separated=RiceModel.separateRects(rects,axis,2)
    return recipe.geometry==="widgets"?RiceModel.balanceMenuPill(separated,axis):separated
  }
  anchors.fill: parent
  z: -1000
  enabled: false
  clip: true
  visible: supported && !hidden && !stockTransparent && live.preset!=="omarchy" && paintRects.length>0

  // Rebuilt on attach and once a second: the flat list of host slots whose boxes
  // check() reads every frame.
  function watch() {
    if(!hostWindow || !hostWindow.contentItem) return
    slotItems=HostGeometry.collectSlots(hostWindow.contentItem)
    slotExtent=extentOf(slotItems)
    sample()
  }
  // One number over the boxes the host itself lays out. Reading it is cheap
  // enough to run on every frame, and the host moves these boxes in the same
  // frame it reflows, so a change is noticed before that frame is painted.
  function extentOf(items) {
    var total=0
    for(var i=0;i<items.length;i++)
      total=total+Number(items[i].width)*1000+Number(items[i].x)
    return total
  }
  function check() {
    if(!sampling) return
    var extent
    try { extent=extentOf(slotItems) }
    catch(error) { slotItems=[]; Qt.callLater(root.watch); return }
    if(extent!==slotExtent){ slotExtent=extent; sample() }
  }
  function sample() {
    if(!hostWindow || !hostWindow.contentItem || !supported || hidden || stockTransparent || live.preset==="omarchy") return
    var geometry=HostGeometry.snapshot(hostWindow.contentItem,vertical)
    var key=JSON.stringify(geometry)
    if(key!==geometrySignature){geometrySignature=key;widgetGeometry=geometry}
  }
  function paintBounds() {
    var result=[]
    for(var i=0;i<surfaces.count;i++){var item=surfaces.itemAt(i);if(item)result.push({x:item.x,y:item.y,width:item.width,height:item.height})}
    return result
  }
  function diagnostics() {
    return {screen:hostWindow&&hostWindow.screen?hostWindow.screen.name:"",position:position,supported:supported,
      hidden:hidden,stockTransparent:stockTransparent,geometryCount:widgetGeometry.length,
      surfaceCount:visible?surfaces.count:0,contrast:contrastPlan.contrast,effectiveOpacity:contrastPlan.alpha,
      width:width,height:height,geometry:widgetGeometry,paintBounds:paintBounds()}
  }
  Binding {
    target:root.hostWindow
    property:"color"
    value:"transparent"
    when:root.visible
    restoreMode:Binding.RestoreBindingOrValue
  }
  // A reflow is synchronous: a workspace, a tray icon or an indicator appearing
  // widens one slot and moves every later slot in the same frame. Polling painted
  // the cards from the layout the widgets had already left, so a new workspace
  // showed the surface edges detached from them (the last icons of a group on the
  // wallpaper, the next card starting under an icon). check() runs every frame and
  // takes the expensive snapshot only when a slot box moved; the timer is a slow
  // net for geometry that does not move a box.
  Timer { interval:1000;repeat:true;running:root.sampling;triggeredOnStart:true;onTriggered:root.watch() }
  FrameAnimation {
    running:root.sampling
    onTriggered:root.check()
  }
  Component.onCompleted: Qt.callLater(root.watch)
  onPositionChanged: Qt.callLater(root.sample)
  onLiveChanged: Qt.callLater(root.sample)
  Rectangle {
    visible:root.live.preset==="rail"&&root.live.border
    color:root.themeBorderColor
    x:root.vertical?(root.position==="left"?root.width-1:0):0
    y:root.vertical?0:(root.position==="top"?root.height-1:0)
    width:root.vertical?1:root.width;height:root.vertical?root.height:1
  }
  Repeater {
    id:surfaces
    model:root.paintRects
    delegate:RiceSurface {
      required property var modelData
      required property int index
      x:root.vertical?2:Math.max(0,modelData.x)
      y:root.vertical?Math.max(0,modelData.y):2
      width:root.vertical?Math.max(0,root.width-4):Math.max(0,Math.min(modelData.x+modelData.width,root.width)-x)
      height:root.vertical?Math.max(0,Math.min(modelData.y+modelData.height,root.height)-y):Math.max(0,root.height-4)
      preset:root.live.preset;surfaceColor:root.surfaceColor;themeBorderColor:root.themeBorderColor
      accentColor:Color.accent;foregroundColor:root.nativeForeground;cornerRadius:root.live.radius
      borderEnabled:root.live.border;vertical:root.vertical;reducedMotion:root.service?root.service.reducedMotion:true
      sectionIndex:index
    }
  }
}
