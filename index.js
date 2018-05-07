const dns = require('dns')
const Telnet = require('telnet-client')
const fs = require('fs')
const SVGUtils = require('./lib/SVGUtils')
const MathUtils = require('./lib/MathUtils')
const connection = new Telnet()
let gcode

// Set up application drawing bounds.
const LINE_US_BOUNDS = {
  x: {
    min: 700,
    max: 1700
  },
  y: {
    min: -1000,
    max: 1000
  }
}

const LINE_US_WIDTH = LINE_US_BOUNDS.x.max - LINE_US_BOUNDS.x.min
const LINE_US_HEIGHT = LINE_US_BOUNDS.y.max - LINE_US_BOUNDS.y.min

// Check if the user supplied an SVG.
if (process.argv.length < 3) {
  console.log(`Usage: node index.js PATH_TO_SVG`)
  process.exit(1)
}

// Manipulates gcode to fit within the line-us printable boundaries.
const processGCode = gcode => {
  console.log('Processing gcode.')

  // Determine the bounds of the gcode.
  console.log('Getting drawing bounds.')
  let bounds = MathUtils.getBounds(gcode)

  const drawingWidth = bounds.x.max - bounds.x.min
  const drawingHeight = bounds.y.max - bounds.y.min

  // Which side of the image greater exceeds the bounds?
  let xScaleDiff = drawingWidth / LINE_US_WIDTH
  let yScaleDiff = drawingHeight / LINE_US_HEIGHT

  // Take the larger of the two & use that as the drawing's new inverse scale.
  const scale = 1 / (xScaleDiff > yScaleDiff ? xScaleDiff : yScaleDiff)

  // gcode.forEach(g => {
  //   console.log(`(${Math.round(g.X)},${Math.round(g.Y)})`)
  // })
  // Go through all the points & scale.
  console.log('Scaling points.')
  gcode = MathUtils.scalePoints(gcode, scale)

  // Scale the old bounds to their new size.
  console.log('Scaling bounds.')
  bounds = MathUtils.scaleBounds(bounds, scale)

  // Now, center the drawing within the bounds.
  let drawingCenter = MathUtils.getCenterPoint(bounds)
  let boundsCenter = MathUtils.getCenterPoint(LINE_US_BOUNDS)
  let centerDiffX = boundsCenter.x - drawingCenter.x
  let centerDiffY = boundsCenter.y - drawingCenter.y

  // Go through all points & adjust to center.
  console.log('Transforming points.')
  gcode = MathUtils.transformPoints(gcode, centerDiffX, centerDiffY)

  // // Adjust the bounds (this doesn't really have any functional purpose)
  // bounds = transformRect(bounds, centerDiffX, centerDiffY)

  console.log('Reducing close points.')
  // Go through & remove points that are very close to each other.
  let prevGCode
  for (var i = gcode.length; i > -1; i--) {
    let currentGCode = gcode[i]
    if (prevGCode) {
      let dist = MathUtils.distance(currentGCode, prevGCode)
      // console.log(i, dist)
      if (dist < 10) { // 10mm
        // Remove.
        gcode.splice(i, 1)
        continue // Don't set prevGCode, as we removed it.
      }
    }
    prevGCode = currentGCode
  }

  return gcode
}

// Sends a gcode instruction to the line-us
const sendGCode = () => {
  if (gcode.length) {
    let step = SVGUtils.obj2GCode(gcode.shift())
    process.stdout.write(`Sending ${step}....`)
    connection.send(`${step}\0`,
      {
        shellPrompt: /(.+)\0/, // If this isn't right, we either don't get a response, or an empty response.
        stripShellPrompt: false,
        timeout: 5000
      })
      .then((rsp) => {
        process.stdout.write(`${rsp}`)
        setTimeout(() => {
          sendGCode()
        }, 1)
      })
  } else {
    console.log('done')
    process.exit()
  }
}

const svgPath = process.argv[2]

if (!fs.existsSync(svgPath)) {
  console.log(`Could not locate an SVG at ${svgPath}`)
  process.exit(1)
} else {
  (async () => {
    // Convert SVG into an array of GCode objects.
    // We need these in a numeric format to scale them.
    gcode = await SVGUtils.traceSVGFile(svgPath)

    // Scale to best fit the machine's drawing bounds.
    gcode = processGCode(gcode)

    dns.lookup('line-us.local', (err, addresses) => {
      if (err) {
        console.log(err)
        process.exit()
      }
      console.log(`Resolved IP to ${addresses}`)
      connection.connect({
        host: addresses,
        port: 1337,
        shellPrompt: /([^\r]+\r\n\0)/
      })
        .then(prompt => {
          console.log(`Connected.`)
          sendGCode()
        })
    })
  })()
}
