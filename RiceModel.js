var PRESETS = [
  "omarchy", "islands", "pills", "material", "outline",
  "rail", "bracket", "glow", "powerline", "mono", "minimal"
]

var PAINT_RECIPES = {
  omarchy: { geometry: "none", decoration: "none", fill: "none", border: "none", radius: "none" },
  islands: { geometry: "sections", decoration: "surface", fill: "surface", border: "optional", radius: "user" },
  pills: { geometry: "widgets", decoration: "surface", fill: "surface", border: "optional", radius: "user" },
  material: { geometry: "sections", decoration: "material", fill: "tonal", border: "none", radius: "user" },
  outline: { geometry: "sections", decoration: "outline", fill: "faint", border: "accent", radius: "user" },
  rail: { geometry: "sections", decoration: "rail", fill: "none", border: "none", radius: "none" },
  bracket: { geometry: "sections", decoration: "bracket", fill: "none", border: "none", radius: "none" },
  glow: { geometry: "sections", decoration: "glow", fill: "dark", border: "layered", radius: "user" },
  powerline: { geometry: "sections", decoration: "powerline", fill: "surface", border: "accent", radius: "none" },
  mono: { geometry: "sections", decoration: "mono", fill: "dark", border: "text", radius: "user" },
  minimal: { geometry: "sections", decoration: "minimal", fill: "none", border: "none", radius: "none" }
}

var STYLE_DEFAULTS = {
  omarchy: { opacity: 100, radius: 0, gap: 0, border: false },
  islands: { opacity: 92, radius: 12, gap: 4, border: true },
  pills: { opacity: 90, radius: 18, gap: 3, border: true },
  material: { opacity: 92, radius: 20, gap: 8, border: false },
  outline: { opacity: 20, radius: 14, gap: 6, border: true },
  rail: { opacity: 60, radius: 0, gap: 4, border: false },
  bracket: { opacity: 20, radius: 0, gap: 8, border: true },
  glow: { opacity: 82, radius: 16, gap: 8, border: true },
  powerline: { opacity: 92, radius: 0, gap: 6, border: true },
  mono: { opacity: 96, radius: 2, gap: 3, border: true },
  minimal: { opacity: 55, radius: 0, gap: 2, border: false }
}

var DEFAULTS = {
  preset: "islands",
  opacity: STYLE_DEFAULTS.islands.opacity,
  radius: STYLE_DEFAULTS.islands.radius,
  gap: STYLE_DEFAULTS.islands.gap,
  border: STYLE_DEFAULTS.islands.border
}

function clamp(value, min, max) {
  var number = Number(value)
  if (!isFinite(number)) number = min
  return Math.max(min, Math.min(max, number))
}

function normalizePreset(value) {
  var preset = String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase()
  if (preset === "default" || preset === "stock") return "omarchy"
  return PRESETS.indexOf(preset) !== -1 ? preset : DEFAULTS.preset
}

function paintRecipe(value) {
  var preset = normalizePreset(value)
  var source = PAINT_RECIPES[preset] || PAINT_RECIPES.islands
  return {
    geometry: source.geometry,
    decoration: source.decoration,
    fill: source.fill,
    border: source.border,
    radius: source.radius
  }
}

function colorChannels(value) {
  if (value && typeof value === "object"
      && value.r !== undefined && value.g !== undefined && value.b !== undefined) {
    return {
      r: clamp(value.r, 0, 1),
      g: clamp(value.g, 0, 1),
      b: clamp(value.b, 0, 1)
    }
  }
  var text = String(value || "").replace(/^\s+|\s+$/g, "")
  var match = /^#([0-9a-f]{6})$/i.exec(text)
  if (!match) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(match[1].slice(0, 2), 16) / 255,
    g: parseInt(match[1].slice(2, 4), 16) / 255,
    b: parseInt(match[1].slice(4, 6), 16) / 255
  }
}

function relativeLuminance(value) {
  var color = colorChannels(value)
  function linear(channel) {
    return channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b)
}

function contrastRatio(first, second) {
  var a = relativeLuminance(first)
  var b = relativeLuminance(second)
  var lighter = Math.max(a, b)
  var darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

function needsContrastSurface(background, foreground, accent) {
  return contrastRatio(background, foreground) < 3
    || contrastRatio(background, accent) < 2
}

function contrastSurface(background, foreground, accent) {
  if (!needsContrastSurface(background, foreground, accent)) return background
  return contrastRatio("#000000", foreground) >= contrastRatio("#ffffff", foreground)
    ? "#000000"
    : "#ffffff"
}

function contrastColor(preferred, alternate, background) {
  return contrastRatio(preferred, background) >= contrastRatio(alternate, background)
    ? preferred
    : alternate
}

function readableForeground(surface, themeText, alternate) {
  var best = contrastColor(themeText, alternate, surface)
  if (contrastRatio(best, surface) >= 4.5) return best
  return contrastRatio("#000000", surface) >= contrastRatio("#ffffff", surface)
    ? "#000000"
    : "#ffffff"
}

function visibleAlpha(opacity, floor) {
  var minimum = clamp(floor, 0, 1)
  var adjusted = clamp(opacity, 0, 100) / 100
  return Math.min(1, minimum + adjusted * (1 - minimum))
}

function styleDefaults(value) {
  var preset = normalizePreset(value)
  var source = STYLE_DEFAULTS[preset] || STYLE_DEFAULTS.islands
  return {
    opacity: source.opacity,
    radius: source.radius,
    gap: source.gap,
    border: source.border
  }
}

function boolValue(value, fallback) {
  if (value === true || value === "true" || value === 1 || value === "1") return true
  if (value === false || value === "false" || value === 0 || value === "0") return false
  return fallback === true
}

function hasAppearance(source) {
  return source && typeof source === "object" && (
    source.opacity !== undefined || source.radius !== undefined
      || source.gap !== undefined || source.border !== undefined
  )
}

function normalizeAppearance(source, fallback) {
  var values = source && typeof source === "object" ? source : {}
  var defaults = fallback && typeof fallback === "object" ? fallback : STYLE_DEFAULTS.islands
  return {
    opacity: Math.round(clamp(values.opacity === undefined ? defaults.opacity : values.opacity, 20, 100)),
    radius: Math.round(clamp(values.radius === undefined ? defaults.radius : values.radius, 0, 24)),
    gap: Math.round(clamp(values.gap === undefined ? defaults.gap : values.gap, 0, 24)),
    border: boolValue(values.border, defaults.border)
  }
}

function profilesFor(settings) {
  var source = settings && typeof settings === "object" ? settings.profiles : null
  var result = {}
  if (!source || typeof source !== "object") return result
  for (var i = 0; i < PRESETS.length; i++) {
    var preset = PRESETS[i]
    if (source[preset] && typeof source[preset] === "object")
      result[preset] = normalizeAppearance(source[preset], styleDefaults(preset))
  }
  return result
}

var PROFILE_VERSION = 1

function settingsObject(preset, appearance, profiles) {
  return {
    preset: preset,
    opacity: appearance.opacity,
    radius: appearance.radius,
    gap: appearance.gap,
    border: appearance.border,
    profiles: profiles,
    profileVersion: PROFILE_VERSION,
    activeProfile: preset
  }
}

function resolvedState(settings) {
  var source = settings && typeof settings === "object" ? settings : {}
  var legacyGlass = String(source.preset || "").replace(/^\s+|\s+$/g, "").toLowerCase() === "glass"
  var preset = normalizePreset(source.preset)
  var profiles = profilesFor(source)
  if (legacyGlass) {
    var migrated = normalizeAppearance(source, styleDefaults(preset))
    profiles[preset] = migrated
    return { preset: preset, appearance: migrated, profiles: profiles }
  }
  var marked = Number(source.profileVersion) === PROFILE_VERSION
    && PRESETS.indexOf(String(source.activeProfile || "").toLowerCase()) !== -1
  var activeProfile = marked ? normalizePreset(source.activeProfile) : preset
  var appearance

  if (marked) {
    if (hasAppearance(source))
      profiles[activeProfile] = normalizeAppearance(source, styleDefaults(activeProfile))
    appearance = activeProfile === preset
      ? (profiles[activeProfile] || styleDefaults(preset))
      : (profiles[preset] || styleDefaults(preset))
  } else {
    var values = hasAppearance(source)
      ? source
      : (profiles[preset] ? profiles[preset] : styleDefaults(preset))
    appearance = normalizeAppearance(values, styleDefaults(preset))
  }

  return { preset: preset, appearance: appearance, profiles: profiles }
}

function snapshot(settings) {
  var state = resolvedState(settings)
  return {
    preset: state.preset,
    opacity: state.appearance.opacity,
    radius: state.appearance.radius,
    gap: state.appearance.gap,
    border: state.appearance.border
  }
}

function switchPreset(settings, value) {
  var state = resolvedState(settings)
  state.profiles[state.preset] = normalizeAppearance(state.appearance, styleDefaults(state.preset))
  var preset = normalizePreset(value)
  var appearance = state.profiles[preset]
    ? state.profiles[preset]
    : styleDefaults(preset)
  return settingsObject(preset, appearance, state.profiles)
}

function updateAppearance(settings, values) {
  var state = resolvedState(settings)
  var current = state.appearance
  var changes = values && typeof values === "object" ? values : {}
  var merged = {
    opacity: changes.opacity === undefined ? current.opacity : changes.opacity,
    radius: changes.radius === undefined ? current.radius : changes.radius,
    gap: changes.gap === undefined ? current.gap : changes.gap,
    border: changes.border === undefined ? current.border : changes.border
  }
  var appearance = normalizeAppearance(merged, styleDefaults(state.preset))
  state.profiles[state.preset] = appearance
  return settingsObject(state.preset, appearance, state.profiles)
}

function resetPreset(settings) {
  var state = resolvedState(settings)
  delete state.profiles[state.preset]
  return settingsObject(state.preset, styleDefaults(state.preset), state.profiles)
}

function visibleWidgets(items, controllerId) {
  if (!Array.isArray(items)) return []
  var excluded = String(controllerId || "")
  return items.filter(function(item) {
    if (!item || String(item.id || "") === excluded) return false
    return item.visible === true && item.itemVisible !== false
      && Number(item.width) > 0 && Number(item.height) > 0
  })
}

function findEntry(config, id) {
  var source = config && typeof config === "object" ? config : {}
  var layout = source.bar && source.bar.layout && typeof source.bar.layout === "object"
    ? source.bar.layout : {}
  var sections = ["left", "center", "right"]
  for (var s = 0; s < sections.length; s++) {
    var entries = layout[sections[s]]
    if (!Array.isArray(entries)) continue
    for (var i = 0; i < entries.length; i++) {
      if (entries[i] && String(entries[i].id || "") === String(id || "")) return entries[i]
    }
  }
  if (Array.isArray(source.plugins)) {
    for (var p = 0; p < source.plugins.length; p++) {
      if (source.plugins[p] && String(source.plugins[p].id || "") === String(id || "")) return source.plugins[p]
    }
  }
  return {}
}

function boundsFor(items, key, padding) {
  if (!items.length) return null
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (var i = 0; i < items.length; i++) {
    var item = items[i]
    minX = Math.min(minX, Number(item.x))
    minY = Math.min(minY, Number(item.y))
    maxX = Math.max(maxX, Number(item.x) + Number(item.width))
    maxY = Math.max(maxY, Number(item.y) + Number(item.height))
  }
  var pad = Math.max(0, Number(padding) || 0)
  return {
    key: key,
    x: Math.round(minX - pad),
    y: Math.round(minY - pad),
    width: Math.round(maxX - minX + pad * 2),
    height: Math.round(maxY - minY + pad * 2)
  }
}

function islandMember(item, section) {
  if (!item || String(item.section) !== section) return item
  var leaves = Array.isArray(item.leaves) ? item.leaves.filter(function(leaf) {
    return leaf && leaf.visible !== false && leaf.itemVisible !== false
      && Number(leaf.width) > 0 && Number(leaf.height) > 0
  }) : []
  if (section !== "right" || String(item.id) !== "omarchy.tray" || !leaves.length) return item
  var leafBounds = boundsFor(leaves, "tray", 0)
  if (!leafBounds || leafBounds.x <= Number(item.x)) return item
  return {
    id: item.id,
    section: item.section,
    x: leafBounds.x,
    y: Math.min(Number(item.y), leafBounds.y),
    width: Math.max(leafBounds.width, Number(item.x) + Number(item.width) - leafBounds.x),
    height: Math.max(Number(item.height), leafBounds.height),
    visible: true,
    itemVisible: true
  }
}

function islandRects(items, padding, controllerId) {
  var visible = visibleWidgets(items, controllerId)
  var sections = ["left", "center", "right"]
  var result = []
  for (var i = 0; i < sections.length; i++) {
    var section = sections[i]
    var members = visible.filter(function(item) { return String(item.section) === section })
      .map(function(item) { return islandMember(item, section) })
    var rect = boundsFor(members, section, padding)
    if (rect) result.push(rect)
  }
  return result
}

function isSlotSized(width, height, barSize) {
  var w = Number(width) || 0
  var h = Number(height) || 0
  var slot = Math.max(18, Number(barSize) || 26)
  if (!(w >= 20 && h >= 20 && w <= slot + 10 && h <= slot + 10)) return false
  return Math.max(w, h) / Math.min(w, h) <= 1.65
}

function uniqueByPosition(items, axis) {
  if (!Array.isArray(items)) return []
  var vertical = String(axis || "horizontal") === "vertical"
  var posKey = vertical ? "y" : "x"
  var sizeKey = vertical ? "height" : "width"
  var sorted = items.filter(function(item) { return item }).slice().sort(function(a, b) {
    return Number(a[posKey]) - Number(b[posKey])
  })
  var result = []
  for (var i = 0; i < sorted.length; i++) {
    var item = sorted[i]
    var center = Number(item[posKey]) + Number(item[sizeKey]) / 2
    var merged = false
    for (var r = 0; r < result.length; r++) {
      var current = result[r]
      var currentCenter = Number(current[posKey]) + Number(current[sizeKey]) / 2
      if (Math.abs(center - currentCenter) < 14) {
        merged = true
        break
      }
    }
    if (!merged) result.push(item)
  }
  return result
}

function pillItems(items, controllerId, axis) {
  var visible = visibleWidgets(items, controllerId)
  var result = []
  for (var i = 0; i < visible.length; i++) {
    var item = visible[i]
    var leaves = item && Array.isArray(item.leaves) ? item.leaves : []
    var expanded = []
    for (var l = 0; l < leaves.length; l++) {
      var leaf = leaves[l]
      if (!leaf) continue
      if (leaf.visible === false || leaf.itemVisible === false) continue
      if (!(Number(leaf.width) > 0 && Number(leaf.height) > 0)) continue
      expanded.push({
        id: String(leaf.id || (item.id + "." + l)),
        section: String(leaf.section || item.section || ""),
        x: Number(leaf.x),
        y: Number(leaf.y),
        width: Number(leaf.width),
        height: Number(leaf.height),
        visible: true,
        itemVisible: true
      })
    }
    expanded = uniqueByPosition(expanded, axis)
    if (expanded.length > 1) {
      for (var e = 0; e < expanded.length; e++) result.push(expanded[e])
    } else {
      result.push(item)
    }
  }
  return result
}

function pillRects(items, padding, controllerId, axis) {
  return pillItems(items, controllerId, axis).map(function(item) {
    return boundsFor([item], String(item.id), padding)
  })
}

function separateRects(rects, axis, separation) {
  if (!Array.isArray(rects)) return []
  var vertical = String(axis || "horizontal") === "vertical"
  var positionKey = vertical ? "y" : "x"
  var extentKey = vertical ? "height" : "width"
  var gap = Math.max(0, Math.round(Number(separation) || 0))
  var result = rects.map(function(rect) {
    return {
      key: rect.key,
      x: Number(rect.x),
      y: Number(rect.y),
      width: Number(rect.width),
      height: Number(rect.height)
    }
  }).sort(function(a, b) { return a[positionKey] - b[positionKey] })
  for (var i = 0; i < result.length - 1; i++) {
    var current = result[i]
    var next = result[i + 1]
    var currentEnd = current[positionKey] + current[extentKey]
    var nextEnd = next[positionKey] + next[extentKey]
    if (currentEnd + gap <= next[positionKey]) continue
    var boundary = Math.floor((currentEnd + next[positionKey]) / 2)
    var currentNewEnd = boundary - Math.ceil(gap / 2)
    var nextNewStart = boundary + Math.floor(gap / 2)
    current[extentKey] = Math.max(0, currentNewEnd - current[positionKey])
    next[positionKey] = nextNewStart
    next[extentKey] = Math.max(0, nextEnd - nextNewStart)
  }
  return result
}

function balanceMenuPill(rects, axis) {
  if (!Array.isArray(rects)) return []
  if (String(axis || "horizontal") === "vertical") return rects
  return rects.map(function(rect) {
    if (!rect || String(rect.key) !== "omarchy.menu") return rect
    var inset = Math.min(4, Math.max(0, Number(rect.width) - 1))
    return {
      key: rect.key,
      x: Number(rect.x) + inset,
      y: Number(rect.y),
      width: Math.max(0, Number(rect.width) - inset),
      height: Number(rect.height)
    }
  })
}

function accentRects(rects, position, thickness) {
  var edge = String(position || "top").toLowerCase()
  var size = Math.max(1, Math.round(Number(thickness) || 1))
  if (!Array.isArray(rects)) return []
  return rects.map(function(rect) {
    if (edge === "bottom") {
      return { key: rect.key, x: rect.x + size, y: rect.y, width: Math.max(0, rect.width - size * 2), height: size }
    }
    if (edge === "left") {
      return { key: rect.key, x: rect.x + rect.width - size, y: rect.y + size, width: size, height: Math.max(0, rect.height - size * 2) }
    }
    if (edge === "right") {
      return { key: rect.key, x: rect.x, y: rect.y + size, width: size, height: Math.max(0, rect.height - size * 2) }
    }
    return { key: rect.key, x: rect.x, y: rect.y + rect.height - size, width: rect.width, height: size }
  })
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PRESETS: PRESETS,
    PAINT_RECIPES: PAINT_RECIPES,
    STYLE_DEFAULTS: STYLE_DEFAULTS,
    DEFAULTS: DEFAULTS,
    normalizePreset: normalizePreset,
    paintRecipe: paintRecipe,
    relativeLuminance: relativeLuminance,
    contrastRatio: contrastRatio,
    needsContrastSurface: needsContrastSurface,
    contrastSurface: contrastSurface,
    contrastColor: contrastColor,
    readableForeground: readableForeground,
    visibleAlpha: visibleAlpha,
    styleDefaults: styleDefaults,
    snapshot: snapshot,
    switchPreset: switchPreset,
    updateAppearance: updateAppearance,
    resetPreset: resetPreset,
    visibleWidgets: visibleWidgets,
    findEntry: findEntry,
    islandRects: islandRects,
    pillItems: pillItems,
    uniqueByPosition: uniqueByPosition,
    isSlotSized: isSlotSized,
    pillRects: pillRects,
    separateRects: separateRects,
    balanceMenuPill: balanceMenuPill,
    accentRects: accentRects
  }
}
