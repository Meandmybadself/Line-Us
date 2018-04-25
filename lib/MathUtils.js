const getBounds = rect => {
  let bounds = {
    x: {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY
    },
    y: {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY
    }
  }

  rect.forEach(obj => {
    if (obj.X) {
      if (obj.X > bounds.x.max) {
        bounds.x.max = obj.X
      } else if (obj.X < bounds.x.min) {
        bounds.x.min = obj.X
      }
    }
    if (obj.Y) {
      if (obj.Y > bounds.y.max) {
        bounds.y.max = obj.Y
      } else if (obj.Y < bounds.y.min) {
        bounds.y.min = obj.Y
      }
    }
  })

  return bounds
}

const transformBounds = (rect, x, y) =>
  ({
    x: {
      min: rect.x.min + x,
      max: rect.x.max + x
    },
    y: {
      min: rect.y.min + y,
      max: rect.y.max + y
    }
  })

const transformPoints = (points, x, y) =>
  points.map(obj => {
    if (obj.X) { obj.X = Math.round(obj.X + x) }
    if (obj.Y) { obj.Y = Math.round(obj.X + y) }
    return obj
  })

const scalePoints = (points, scale) =>
  points.map(obj => {
    if (obj.X) { obj.X = Math.round(obj.X * scale) }
    if (obj.Y) { obj.Y = Math.round(obj.Y * scale) }
    return obj
  })

const scaleBounds = (rect, scale) => ({
  x: {
    min: rect.x.min * scale,
    max: rect.x.max * scale
  },
  y: {
    min: rect.y.min * scale,
    max: rect.y.max * scale
  }
})

// Distance between two points.
const distance = (p1, p2) => {
  const a = p1.X - p2.X
  const b = p1.Y - p2.Y

  return Math.sqrt(a * a + b * b)
}

// Returns the center of a rectangle.
const getCenterPoint = (rect) => ({
  x: ((rect.x.max - rect.x.min) / 2) + rect.x.min,
  y: ((rect.y.max - rect.y.min) / 2) + rect.y.min
})

module.exports = {
  distance,
  getBounds,
  getCenterPoint,
  transformBounds,
  transformPoints,
  scaleBounds,
  scalePoints
}
