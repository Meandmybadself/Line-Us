const dns = require('dns')
const Telnet = require('telnet-client')
const fs = require('fs')
const SVG2Gcode = require('svg2gcode')
const SVGO = require('svgo')

const s2g = new SVG2Gcode()
// const s = new SVGO({
//   plugins: [{
//     cleanupAttrs: true
//   }, {
//     removeDoctype: true
//   }, {
//     removeXMLProcInst: true
//   }, {
//     removeComments: true
//   }, {
//     removeMetadata: true
//   }, {
//     removeTitle: true
//   }, {
//     removeDesc: true
//   }, {
//     removeUselessDefs: true
//   }, {
//     removeEditorsNSData: true
//   }, {
//     removeEmptyAttrs: true
//   }, {
//     removeHiddenElems: true
//   }, {
//     removeEmptyText: true
//   }, {
//     removeEmptyContainers: true
//   }, {
//     removeViewBox: false
//   }, {
//     cleanUpEnableBackground: true
//   }, {
//     convertStyleToAttrs: true
//   }, {
//     convertColors: true
//   }, {
//     convertPathData: true
//   }, {
//     convertTransform: true
//   }, {
//     removeUnknownsAndDefaults: true
//   }, {
//     removeNonInheritableGroupAttrs: true
//   }, {
//     removeUselessStrokeAndFill: true
//   }, {
//     removeUnusedNS: true
//   }, {
//     cleanupIDs: true
//   }, {
//     cleanupNumericValues: true
//   }, {
//     moveElemsAttrsToGroup: true
//   }, {
//     moveGroupAttrsToElems: true
//   }, {
//     collapseGroups: true
//   }, {
//     removeRasterImages: false
//   }, {
//     mergePaths: true
//   }, {
//     convertShapeToPath: true
//   }, {
//     sortAttrs: true
//   }, {
//     transformsWithOnePath: false
//   }, {
//     removeDimensions: true
//   }, {
//     removeAttrs: {attrs: '(stroke|fill)'}
//   }]
// })

const connection = new Telnet()

if (process.argv.length < 2) {
  console.log(`Usage: ${process.argv[0]} PATH_TO_SVG`)
  process.exit(1)
}

const svgPath = process.argv[1]

if (!fs.existsSync(svgPath)) {
  console.log(`Could not locate an SVG at ${svgPath}`)
  process.exit(1)
} else {
  let svg = fs.readFileSync(svgPath, {encoding: 'utf8'})
  // Convert SVG into GCode.cd
  console.log('hai')
  // s.optimize(svg, {})
  //   .then(result => {
  //     console.log('result', result)
  //   })
  // console.log(s2g.runWithSVG(svg))
}

process.exit()

// The Line-Us runs at 'line-us.local'.
// Find the IP address (because the telnet client can't resolve string machine names)
dns.lookup('line-us.local', (err, addresses) => {
  if (err) {
    console.log(err)
    process.exit()
  }

  // If we've resolved the
  if (addresses && addresses.length) {
    console.log('Connecting to ', addresses)
    connect(addresses)
      .then(prompt => {
        console.log('Connected.', prompt)
        // Convert SVG into GCode.
        console.log(s2g.runWithSVG(svg))
      })
  } else {
    console.log('Could not resolve local hostname.')
  }
})

const connect = host => connection.connect({
  host,
  port: 1337,
  shellPrompt: /hello .+/
})
