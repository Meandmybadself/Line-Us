
const fs = require('fs')
const path = require('svg-path-properties')
const extract = require('extract-svg-path').parse
const SVGO = require('svgo')

const cleanSVG = (str) => {
  const svgo = new SVGO({
    plugins: [{ cleanupAttrs: true },
      { removeDoctype: true },
      { removeXMLProcInst: true },
      { removeComments: true },
      { removeMetadata: true },
      { removeTitle: true },
      { removeDesc: true },
      { removeUselessDefs: true },
      { removeEditorsNSData: true },
      { removeEmptyAttrs: true },
      { removeHiddenElems: true },
      { removeEmptyText: true },
      { removeEmptyContainers: true },
      { removeViewBox: false },
      { cleanUpEnableBackground: true },
      { convertStyleToAttrs: true },
      { convertColors: true },
      { convertPathData: true },
      { convertTransform: true },
      { removeUnknownsAndDefaults: true },
      { removeNonInheritableGroupAttrs: true },
      { removeUselessStrokeAndFill: true },
      { removeUnusedNS: true },
      { cleanupIDs: true },
      { cleanupNumericValues: true },
      { moveElemsAttrsToGroup: true },
      { moveGroupAttrsToElems: true },
      { collapseGroups: true },
      { removeRasterImages: false },
      { mergePaths: true },
      { convertShapeToPath: true },
      { sortAttrs: true },
      { transformsWithOnePath: false },
      { removeDimensions: true },
      { removeAttrs: { attrs: '(stroke|fill)' } }]
  })
  return svgo.optimize(str)
}

const traceSVGFile = (path, sampleRate = 5) => traceSVGString(fs.readFileSync(path, { encoding: 'utf8' }), sampleRate)

const traceSVGString = async (str, sampleRate = 5) =>
  cleanSVG(str)
    .then(svg => {
      svg = svg.data
      const e = extract(svg)
      const props = path.svgPathProperties(e)
      const len = props.getTotalLength()
      const steps = Math.ceil(len / sampleRate)
      const firstPt = props.getPointAtLength(0)
      // const output = [`G00 X${firstPt.x} Y${firstPt.y} Z500`] // Move pen up & rapidly to the first point.
      const output = [{ G: 0, X: firstPt.x, Y: firstPt.y, Z: 500 }]
      for (var i = 0; i <= steps; i++) {
        const per = i / steps
        const p = props.getPointAtLength(len * per)
        // output.push(`(${Math.round(p.x)},${Math.round(p.y)})`) // For debugging w/ https://www.desmos.com/calculator
        output.push({ G: 1, X: Math.round(p.x), Y: Math.round(p.y), Z: 0 })
      }
      // Return home.
      output.push({ G: 28 })
      return output
    })

// Turns an object into its gcode string equivalent.
const obj2GCode = obj => Object.keys(obj).map(key => `${key}${obj[key]}`).join(' ').replace('G1', 'G01')

module.exports = {
  traceSVGFile,
  traceSVGString,
  obj2GCode
}
