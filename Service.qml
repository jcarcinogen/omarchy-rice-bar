import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import qs.Commons
import qs.Ui
import "RiceModel.js" as RiceModel

// Option A: passive theme-aware chrome behind the live stock bar. This plugin
// never hosts, replaces, or intercepts stock widgets.
Item {
  id: root

  property var shell: null
  property var manifest: null
  property string omarchyPath: ""

  readonly property string pluginId: manifest && manifest.id
    ? String(manifest.id) : "io.github.jcarcinogen.rice-bar"
  readonly property var bar: shell && shell.bar ? shell.bar : null
  readonly property var pluginEntry: RiceModel.findEntry(shell ? shell.shellConfig : null, pluginId)
  readonly property var live: RiceModel.snapshot(pluginEntry)
  readonly property string preset: live.preset
  readonly property bool riceActive: preset !== "omarchy"
  readonly property bool barHidden: bar && "barHidden" in bar ? bar.barHidden === true : false
  readonly property string position: bar && bar.position ? String(bar.position) : "top"
  readonly property bool vertical: position === "left" || position === "right"
  readonly property int barSize: bar && Number(bar.barSize) > 0
    ? Number(bar.barSize)
    : (vertical ? Style.bar.sizeVertical : Style.bar.sizeHorizontal)
  readonly property color surfaceColor: Qt.rgba(
    Color.bar.background.r,
    Color.bar.background.g,
    Color.bar.background.b,
    live.opacity / 100
  )

  property bool stockStateCaptured: false
  property bool stockRequestedTransparent: false
  property int geometrySerial: 0

  function captureStockState() {
    if (stockStateCaptured || !bar) return
    stockRequestedTransparent = bar.requestedTransparent === true
    stockStateCaptured = true
  }

  function useThemeForeground() {
    if (!riceActive || !bar) return
    bar.foregroundAnimationEnabled = false
    bar.transparentForeground = Color.bar.text
    bar.useTransparentForeground = true
    bar.transparent = true
    Qt.callLater(function() {
      if (root.bar) root.bar.foregroundAnimationEnabled = true
    })
  }

  function applyBarMode() {
    if (!bar) return
    captureStockState()
    if (riceActive) {
      if (typeof bar.setRequestedTransparency === "function") bar.setRequestedTransparency(true)
      else bar.transparent = true
      useThemeForeground()
      return
    }
    if (typeof bar.setRequestedTransparency === "function")
      bar.setRequestedTransparency(stockRequestedTransparent)
    else bar.transparent = stockRequestedTransparent
  }

  function restoreStockState() {
    if (!bar || !stockStateCaptured) return
    if (typeof bar.setRequestedTransparency === "function")
      bar.setRequestedTransparency(stockRequestedTransparent)
    else bar.transparent = stockRequestedTransparent
  }

  function childList(item) {
    if (!item) return []
    var list = []
    var children = item.children
    if (children && children.length) {
      for (var i = 0; i < children.length; i++) list.push(children[i])
    }
    if (list.length) return list
    var data = item.data
    if (data && data.length) {
      for (var d = 0; d < data.length; d++) {
        if (data[d] && (data[d].width !== undefined || data[d].implicitWidth !== undefined))
          list.push(data[d])
      }
    }
    return list
  }

  function isSlotSized(item) {
    if (!item) return false
    var w = Number(item.width) || Number(item.implicitWidth) || 0
    var h = Number(item.height) || Number(item.implicitHeight) || 0
    return RiceModel.isSlotSized(w, h, root.barSize)
  }

  function slotLeaves(item) {
    var acc = []
    gatherSlotSized(item, acc)
    return acc
  }

  function gatherSlotSized(item, acc) {
    if (!item || item.visible === false) return
    if (isSlotSized(item)) acc.push(item)
    var children = childList(item)
    for (var i = 0; i < children.length; i++)
      gatherSlotSized(children[i], acc)
  }

  function leafOverlaps(leafPoint, leaf, parentPoint, parent) {
    var ly = Number(leafPoint.y)
    var lh = Number(leaf.height) || Number(leaf.implicitHeight) || 0
    var py = Number(parentPoint.y)
    var ph = Number(parent.height) || Number(root.barSize) || 26
    var overlapH = Math.min(ly + lh, py + ph) - Math.max(ly, py)
    return overlapH > lh * 0.4
  }

  function trayLeaves(slot, point) {
    var leaves = []
    if (!slot || String(slot.moduleName) !== "omarchy.tray") return leaves
    var icons = slotLeaves(slot.activeItem)
    for (var j = 0; j < icons.length; j++) {
      var leaf = icons[j]
      var lp = { x: point.x, y: point.y }
      try { lp = leaf.mapToItem(null, 0, 0) } catch (error) {}
      if (!leafOverlaps(lp, leaf, point, slot)) continue
      leaves.push({
        id: "omarchy.tray." + leaves.length,
        section: String(slot.region || ""),
        x: Math.round(lp.x),
        y: Math.round(lp.y),
        width: Math.round(Number(leaf.width) || Number(leaf.implicitWidth) || 0),
        height: Math.round(Number(leaf.height) || Number(leaf.implicitHeight) || 0),
        visible: true,
        itemVisible: true
      })
    }
    return leaves
  }

  function geometryForScreen(screenName) {
    var serial = geometrySerial
    var result = []
    if (!bar || !Array.isArray(bar.moduleSlots)) return result
    for (var i = 0; i < bar.moduleSlots.length; i++) {
      var slot = bar.moduleSlots[i]
      if (!slot || !slot.activeItem) continue
      var window = typeof bar.slotWindow === "function" ? bar.slotWindow(slot) : null
      if (!window || !window.screen || String(window.screen.name) !== String(screenName)) continue
      var point = { x: Number(slot.x) || 0, y: Number(slot.y) || 0 }
      try { point = slot.mapToItem(null, 0, 0) } catch (error) {}
      result.push({
        id: String(slot.moduleName || ""),
        section: String(slot.region || ""),
        x: Math.round(point.x),
        y: Math.round(point.y),
        width: Math.round(Number(slot.width) || 0),
        height: Math.round(Number(slot.height) || 0),
        visible: slot.visible === true && Number(slot.width) > 0 && Number(slot.height) > 0,
        itemVisible: slot.activeItem.visible === true,
        leaves: trayLeaves(slot, point)
      })
    }
    return result
  }

  function rectsForPreset(value, geometry) {
    var style = RiceModel.normalizePreset(value)
    var axis = vertical ? "vertical" : "horizontal"
    var rects = []
    if (style === "omarchy") return rects
    if (style === "pills")
      rects = RiceModel.pillRects(geometry, Math.max(1, Math.floor(live.gap / 2)), null, axis)
    else if (style === "minimal" || style === "islands")
      rects = RiceModel.islandRects(geometry, live.gap)
    return RiceModel.separateRects(rects, axis, 2)
  }

  function persistPreset(value) {
    var normalized = RiceModel.normalizePreset(value)
    if (!shell || typeof shell.updateEntryInline !== "function") return false
    var next = RiceModel.snapshot(pluginEntry)
    next.preset = normalized
    return shell.updateEntryInline(pluginId, next)
  }

  function panelAction(action) {
    if (!bar) return false
    if (action === "open" && typeof bar.summonBarWidget === "function")
      return bar.summonBarWidget(pluginId) === true
    if (action === "close" && typeof bar.hideBarWidget === "function")
      return bar.hideBarWidget(pluginId) === true
    if (action === "toggle") {
      var opened = typeof bar.isBarWidgetOpen === "function" && bar.isBarWidgetOpen(pluginId)
      return opened ? panelAction("close") : panelAction("open")
    }
    return false
  }

  onBarChanged: Qt.callLater(root.applyBarMode)
  onPresetChanged: Qt.callLater(root.applyBarMode)

  Connections {
    target: root.bar
    function onTransparentForegroundChanged() { root.useThemeForeground() }
    function onRequestedTransparentChanged() {
      if (root.riceActive && !root.bar.requestedTransparent)
        Qt.callLater(root.applyBarMode)
    }
  }

  Connections {
    target: Color.bar
    function onTextChanged() { root.useThemeForeground() }
  }

  Timer {
    interval: 250
    repeat: true
    running: root.riceActive && !root.barHidden
    triggeredOnStart: true
    onTriggered: root.geometrySerial++
  }

  Timer {
    interval: 0
    running: true
    repeat: false
    onTriggered: root.applyBarMode()
  }

  IpcHandler {
    target: "rice-bar"

    function status(): string {
      return JSON.stringify({
        id: root.pluginId,
        architecture: "stock-overlay",
        preset: root.preset,
        shown: root.riceActive && !root.barHidden,
        position: root.position,
        stockBar: root.bar ? true : false,
        stockRequestedTransparent: root.stockRequestedTransparent
      })
    }

    function style(value: string): string {
      var preset = RiceModel.normalizePreset(value)
      root.persistPreset(preset)
      return preset
    }

    function open(): void { root.panelAction("open") }
    function close(): void { root.panelAction("close") }
    function toggle(): void { root.panelAction("toggle") }
  }

  Component.onDestruction: restoreStockState()

  Variants {
    model: Quickshell.screens

    delegate: Component {
      PanelWindow {
        id: riceWindow

        required property var modelData

        screen: modelData
        color: "transparent"
        exclusionMode: ExclusionMode.Ignore
        surfaceFormat.opaque: false

        readonly property bool edgeVertical: root.vertical
        readonly property int span: Math.max(0, root.barSize)
        readonly property var geometry: root.geometryForScreen(modelData.name)
        readonly property var paintRects: root.rectsForPreset(root.preset, geometry)

        visible: root.riceActive && !root.barHidden && span > 0 && !remapGuard.remapping
        implicitWidth: edgeVertical ? span : 0
        implicitHeight: edgeVertical ? 0 : span

        anchors {
          top: root.position === "top" || edgeVertical
          bottom: root.position === "bottom" || edgeVertical
          left: root.position === "left" || !edgeVertical
          right: root.position === "right" || !edgeVertical
        }

        ScreenMoveRemap {
          id: remapGuard
          window: riceWindow
        }

        WlrLayershell.namespace: "omarchy-rice-bar"
        WlrLayershell.layer: WlrLayer.Bottom
        WlrLayershell.keyboardFocus: WlrKeyboardFocus.None

        mask: Region {}

        Repeater {
          model: riceWindow.paintRects

          delegate: Rectangle {
            required property var modelData

            readonly property bool minimal: root.preset === "minimal"
            readonly property int inset: minimal ? 0 : 2
            readonly property int rule: 2

            x: {
              if (minimal && root.position === "left") return riceWindow.span - rule
              if (minimal && root.position === "right") return 0
              if (riceWindow.edgeVertical) return inset
              return Math.max(0, modelData.x)
            }
            y: {
              if (minimal && root.position === "top") return riceWindow.span - rule
              if (minimal && root.position === "bottom") return 0
              if (!riceWindow.edgeVertical) return inset
              return Math.max(0, modelData.y)
            }
            width: {
              if (minimal && riceWindow.edgeVertical) return rule
              if (riceWindow.edgeVertical) return Math.max(0, riceWindow.span - inset * 2)
              return Math.max(0, Math.min(modelData.width, riceWindow.width - x))
            }
            height: {
              if (minimal && !riceWindow.edgeVertical) return rule
              if (!riceWindow.edgeVertical) return Math.max(0, riceWindow.span - inset * 2)
              return Math.max(0, Math.min(modelData.height, riceWindow.height - y))
            }

            radius: minimal ? rule / 2 : Math.min(root.live.radius, width / 2, height / 2)
            color: minimal ? Color.accent : root.surfaceColor
            border.width: !minimal && root.live.border ? 1 : 0
            border.color: Color.accent
            antialiasing: true

            Behavior on x { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on y { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on width { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on height { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on color { ColorAnimation { duration: 420; easing.type: Easing.InOutCubic } }
          }
        }
      }
    }
  }
}
