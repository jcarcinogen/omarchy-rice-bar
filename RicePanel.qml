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
  readonly property bool appearanceControlsEnabled: live.preset !== "omarchy"
  readonly property color foreground: bar ? bar.foreground : Color.popups.text
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family

  function persistSettings(next) {
    settings = next
    if (hostWidget && "settings" in hostWidget) hostWidget.settings = next
    if (bar && bar.shell && typeof bar.shell.updateEntryInline === "function")
      bar.shell.updateEntryInline(root.moduleName, next)
  }

  function selectPreset(value) {
    persistSettings(RiceModel.switchPreset(settings, value))
  }

  function persistAppearance(values) {
    persistSettings(RiceModel.updateAppearance(settings, values))
  }

  function resetCurrentPreset() {
    persistSettings(RiceModel.resetPreset(settings))
  }

  function styleLabel(value) {
    var preset = RiceModel.normalizePreset(value)
    if (preset === "omarchy") return "Default"
    return preset.charAt(0).toUpperCase() + preset.slice(1)
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
            id: styleDropdown
            width: parent.width
            label: "Style"
            fontFamily: root.fontFamily
            options: [
              { value: "omarchy", label: "Default" },
              { value: "islands", label: "Islands" },
              { value: "pills", label: "Pills" },
              { value: "material", label: "Material" },
              { value: "outline", label: "Outline" },
              { value: "rail", label: "Rail" },
              { value: "bracket", label: "Bracket" },
              { value: "glow", label: "Glow" },
              { value: "powerline", label: "Powerline" },
              { value: "mono", label: "Mono" },
              { value: "minimal", label: "Minimal" }
            ]
            onChanged: function(value) { root.selectPreset(value) }
          }

          Binding {
            target: styleDropdown
            property: "value"
            value: root.live.preset
          }

          Text {
            width: parent.width
            text: {
              if (root.live.preset === "omarchy") return "The unmodified stock bar."
              if (root.live.preset === "pills") return "One compact surface behind each visible widget."
              if (root.live.preset === "material") return "Soft tonal section cards with a stronger center surface."
              if (root.live.preset === "outline") return "Nearly transparent sections defined by crisp accent outlines."
              if (root.live.preset === "rail") return "A continuous inner-edge rail with brighter section segments."
              if (root.live.preset === "bracket") return "Technical accent corner brackets around each stock section."
              if (root.live.preset === "glow") return "Dark surfaces with layered theme-accent outlines."
              if (root.live.preset === "powerline") return "Angular section backplates inspired by classic Unix bars."
              if (root.live.preset === "mono") return "Sharp high-contrast cards with restrained theme borders."
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
            enabled: root.appearanceControlsEnabled
            value: root.live.opacity
            onMoved: function(value) { root.persistAppearance({ opacity: value }) }
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
            enabled: root.appearanceControlsEnabled
            value: root.live.radius
            onMoved: function(value) { root.persistAppearance({ radius: value }) }
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
            enabled: root.appearanceControlsEnabled
            value: root.live.gap
            onMoved: function(value) { root.persistAppearance({ gap: value }) }
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
              enabled: root.appearanceControlsEnabled
              checked: root.live.border
              foreground: root.foreground
              accent: Color.accent
              onToggled: root.persistAppearance({ border: !root.live.border })
            }
          }

          Button {
            width: parent.width
            text: "Restore " + root.styleLabel(root.live.preset) + " defaults"
            iconText: "󰑓"
            foreground: root.foreground
            bordered: true
            onClicked: root.resetCurrentPreset()
          }
        }
      }
    }
  }
}
