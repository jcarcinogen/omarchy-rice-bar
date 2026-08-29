pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Layouts
import qs.Commons
import qs.Ui
import "RiceModel.js" as RiceModel

Panel {
  id: root
  moduleName: "io.github.jcarcinogen.rice-bar"
  ipcTarget: "rice-bar"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root
  readonly property var live: RiceModel.snapshot(settings)
  readonly property color foreground: bar ? bar.foreground : Color.popups.text
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family

  function persist(values) {
    var next = RiceModel.snapshot(settings)
    for (var key in values) next[key] = values[key]
    settings = next
    if (hostWidget && "settings" in hostWidget) hostWidget.settings = next
    if (bar && bar.shell && typeof bar.shell.updateEntryInline === "function")
      bar.shell.updateEntryInline(root.moduleName, next)
  }

  function open() { root.controller.show() }
  function close() { root.controller.hide() }
  function toggle() { opened ? close() : open() }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(360))
    contentHeight: panel.fittedContentHeight(body.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }

      Flickable {
        anchors.fill: parent
        contentWidth: width
        contentHeight: body.implicitHeight
        clip: true
        interactive: contentHeight > height
        boundsBehavior: Flickable.StopAtBounds

        Column {
          id: body
          width: parent.width
          spacing: Style.space(12)

          PanelHero {
            width: parent.width
            title: "Rice Bar"
            meta: "Stock widgets · theme colors"
            detail: root.live.preset === "omarchy" ? "Default" : root.live.preset
            foreground: root.foreground
            fontFamily: root.fontFamily
            iconComponent: riceIcon
          }

          Component {
            id: riceIcon
            Text {
              text: "󰟪"
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.display
            }
          }

          Text {
            width: parent.width
            text: "Only the chrome changes. The stock logo, widgets, panels, gestures, layout, and keyboard behavior remain in place."
            wrapMode: Text.WordWrap
            color: Qt.darker(root.foreground, 1.35)
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
          }

          PanelSeparator { foreground: root.foreground }

          Dropdown {
            width: parent.width
            label: "Style"
            fontFamily: root.fontFamily
            options: [
              { value: "omarchy", label: "Default" },
              { value: "islands", label: "Islands" },
              { value: "pills", label: "Pills" },
              { value: "minimal", label: "Minimal" }
            ]
            value: root.live.preset
            onChanged: function(value) { root.persist({ preset: value }) }
          }

          Text {
            width: parent.width
            text: {
              if (root.live.preset === "omarchy") return "The unmodified stock bar."
              if (root.live.preset === "pills") return "One compact surface behind each visible widget."
              if (root.live.preset === "minimal") return "A restrained accent on the bar's inner edge."
              return "Rounded left, center, and right surfaces."
            }
            wrapMode: Text.WordWrap
            color: Qt.darker(root.foreground, 1.35)
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
          }

          PanelSeparator { foreground: root.foreground }

          PanelSectionHeader {
            text: "SURFACE"
            foreground: root.foreground
            fontFamily: root.fontFamily
          }

          RowLayout {
            width: parent.width
            Text {
              text: "Opacity"
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
              font.bold: true
              Layout.fillWidth: true
            }
            Text {
              text: root.live.opacity + "%"
              color: Qt.darker(root.foreground, 1.35)
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
            }
          }

          PanelSlider {
            width: parent.width
            bar: root.bar
            minimum: 20
            maximum: 100
            step: 2
            integer: true
            value: root.live.opacity
            onMoved: function(value) { root.persist({ opacity: value }) }
          }

          RowLayout {
            width: parent.width
            Text {
              text: "Corner radius"
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
              font.bold: true
              Layout.fillWidth: true
            }
            Text {
              text: root.live.radius + " px"
              color: Qt.darker(root.foreground, 1.35)
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
            }
          }

          PanelSlider {
            width: parent.width
            bar: root.bar
            minimum: 0
            maximum: 24
            step: 1
            integer: true
            value: root.live.radius
            onMoved: function(value) { root.persist({ radius: value }) }
          }

          RowLayout {
            width: parent.width
            Text {
              text: "Breathing room"
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
              font.bold: true
              Layout.fillWidth: true
            }
            Text {
              text: root.live.gap + " px"
              color: Qt.darker(root.foreground, 1.35)
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
            }
          }

          PanelSlider {
            width: parent.width
            bar: root.bar
            minimum: 0
            maximum: 24
            step: 1
            integer: true
            value: root.live.gap
            onMoved: function(value) { root.persist({ gap: value }) }
          }

          RowLayout {
            width: parent.width
            Text {
              text: "Accent border"
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
              font.bold: true
              Layout.fillWidth: true
            }
            ToggleSwitch {
              checked: root.live.border
              foreground: root.foreground
              accent: Color.accent
              onToggled: root.persist({ border: !root.live.border })
            }
          }

          Button {
            width: parent.width
            text: "Restore default bar"
            iconText: "󰑓"
            foreground: root.foreground
            bordered: true
            onClicked: root.persist({ preset: "omarchy" })
          }
        }
      }
    }
  }
}
