var PRESETS = ["omarchy", "islands", "pills", "minimal"]

var DEFAULTS = {
  preset: "islands",
  opacity: 92,
  radius: 12,
  gap: 4,
  border: true
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

function boolValue(value, fallback) {
  if (value === true || value === "true" || value === 1 || value === "1") return true
  if (value === false || value === "false" || value === 0 || value === "0") return false
  return fallback === true
}

function snapshot(settings) {
  var source = settings && typeof settings === "object" ? settings : {}
  return {
    preset: normalizePreset(source.preset),
    opacity: Math.round(clamp(source.opacity === undefined ? DEFAULTS.opacity : source.opacity, 20, 100)),
    radius: Math.round(clamp(source.radius === undefined ? DEFAULTS.radius : source.radius, 0, 24)),
    gap: Math.round(clamp(source.gap === undefined ? DEFAULTS.gap : source.gap, 0, 24)),
    border: boolValue(source.border, DEFAULTS.border)
  }
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

function islandRects(items, padding, controllerId) {
  var visible = visibleWidgets(items, controllerId)
  var sections = ["left", "center", "right"]
  var result = []
  for (var i = 0; i < sections.length; i++) {
    var section = sections[i]
    var members = visible.filter(function(item) { return String(item.section) === section })
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
    DEFAULTS: DEFAULTS,
    normalizePreset: normalizePreset,
    snapshot: snapshot,
    visibleWidgets: visibleWidgets,
    findEntry: findEntry,
    islandRects: islandRects,
    pillItems: pillItems,
    uniqueByPosition: uniqueByPosition,
    isSlotSized: isSlotSized,
    pillRects: pillRects,
    separateRects: separateRects,
    accentRects: accentRects
  }
}
