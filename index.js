const dns = require('dns')
const Telnet = require('telnet-client')
const fs = require('fs')
const { exec } = require('child_process')
const connection = new Telnet()
let gcode

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

// const LINE_US_CENTER_X = LINE_US_WIDTH / 2
// const LINE_US_CENTER_Y = LINE_US_HEIGHT / 2

const bounds = {
  x: {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY
  },
  y: {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY
  }
}

// connection.on('data', data => { console.log(`data - ${data}`) })
// connection.on('ready', ready => { console.log(`ready - ${ready}`) })
connection.on('end', end => { console.log(`end - ${end}`) })

if (process.argv.length < 3) {
  console.log(`Usage: node index.js PATH_TO_SVG`)
  process.exit(1)
}

const svgPath = process.argv[2]

const cleanSVG = svgPath =>
  new Promise((resolve, reject) => {
    exec(`./node_modules/.bin/svgo --output=- --pretty ${svgPath}`, (err, stdout, stderr) => {
      if (err || stderr) {
        return reject(err || stderr)
      }

      return resolve(stdout)
    })
  }
  )

// Converts SVG into an array of GCode objects.s
const convertSVG = svg =>
  new Promise((resolve, reject) => {
    exec(`echo '${svg}' | node ./lib/svg2gcode --tooldiameter 1`, (err, stdout, stderr) => {
      if (err || stderr) {
        return reject(err || stderr)
      }

      // Convert the gcode into numeric values so we can manipulate it w/ math
      let gcode = stdout.split('\n')
      const captureRegex = /([A-Z])(.+)/
      gcode = gcode.map(line => {
        return line.split(/\s+/) // Break into components. ['G01', 'X10', 'Y20', 'Z10']
          .map(c => { // Convert into key / numeric value pairs. {G:20, X:10}
            const match = captureRegex.exec(c)
            if (match && match[2]) {
              const code = match[1]
              // If it's an int, make it an int. Otherwise, make it a float.
              const value = match[2].includes('.') ? parseFloat(match[2]) : parseInt(match[2])

              // Construct bounds.
              switch (code) {
                case 'X':
                  if (value < bounds.x.min) {
                    bounds.x.min = value
                  } else if (value > bounds.x.max) {
                    bounds.x.max = value
                  }
                  break
                case 'Y':
                  if (value < bounds.y.min) {
                    bounds.y.min = value
                  } else if (value > bounds.y.max) {
                    bounds.y.max = value
                  }
                  break
              }

              return {
                [code]: value
              }
            }
            return ''
          })
      }).filter(a => a.length > 1 || (a.length === 1 && a[0])) // no empty items.
        .map(line => { // Condense all objects in line into one object.
          let obj = {}
          line.forEach(o2 => {
            obj = { ...obj, ...o2 }
          })
          return obj
        })

        //
      // console.log('bounds', bounds)

      return resolve(gcode)
    })
  })

// Manipulates gcode to fit within the line-us printable boundaries.
const processGCode = gcode => {
  const drawingWidth = bounds.x.max - bounds.x.min
  const drawingHeight = bounds.y.max - bounds.y.min

  // Which side of the image greater exceeds the bounds?
  let xScaleDiff = drawingWidth / LINE_US_WIDTH
  let yScaleDiff = drawingHeight / LINE_US_HEIGHT

  // Take the larger of the two & use that as the drawing's new inverse scale.
  let targetScale = 1 / (xScaleDiff > yScaleDiff ? xScaleDiff : yScaleDiff)

  // Go through all the points & scale.
  gcode = gcode.map(obj => {
    if (obj.X) { obj.X *= targetScale }
    if (obj.Y) { obj.Y *= targetScale }
    return obj
  })

  // Scale the old bounds to their new size.
  bounds.x.min *= targetScale
  bounds.x.max *= targetScale
  bounds.y.min *= targetScale
  bounds.y.max *= targetScale

  // Now, center the drawing within the bounds.
  let drawingCenter = getCenterPoint(bounds)
  let boundsCenter = getCenterPoint(LINE_US_BOUNDS)
  let centerDiffX = boundsCenter.x - drawingCenter.x
  let centerDiffY = boundsCenter.y - drawingCenter.y

  // Go through all points & adjust to center.
  gcode = gcode.map(obj => {
    if (obj.X) { obj.X += centerDiffX }
    if (obj.Y) { obj.Y += centerDiffY }

    return obj
  })

  // Adjust the bounds (this doesn't really have any functional purpose)
  bounds.x.min += centerDiffX
  bounds.x.max += centerDiffX
  bounds.y.min += centerDiffY
  bounds.y.max += centerDiffY

  return gcode
}

const getCenterPoint = rect => {
  return {
    x: ((rect.x.max - rect.x.min) / 2) + rect.x.min,
    y: ((rect.y.max - rect.y.min) / 2) + rect.y.min
  }
}

const obj2GCode = obj => {
  return Object.keys(obj).map(key => `${key}${obj[key]}`).join(' ').replace('G1', 'G01')
}

const sendGCode = () => {
  if (gcode.length) {
    let step = obj2GCode(gcode.shift())
    console.log(`sending ${step}`)
    connection.send(`${step}\r\n\0`,
      {
        shellPrompt: /(.+)\r\n\0/, // If this isn't right, we either don't get a response, or an empty response.
        stripShellPrompt: false
      })
      .then((err, rsp) => {
        console.log('+', err, rsp)
        process.stdout.write(`${gcode.length}|`)
        setTimeout(() => {
          sendGCode()
        }, 1000)
      })
  } else {
    console.log('done')
  }
}

if (!fs.existsSync(svgPath)) {
  console.log(`Could not locate an SVG at ${svgPath}`)
  process.exit(1)
} else {
  // Optimize / clean the SVG.
  cleanSVG(svgPath)
    .then(cleanedSVG => {
      console.log('Cleaned SVG.')
      convertSVG(cleanedSVG.trim())
        .then(g => {
          console.log('Converted SVG.')

          // Process GCode to fit within line-us bounds.
          gcode = processGCode(g)

          // The Line-Us runs at 'line-us.local'.
          // Find the IP address (because the telnet client can't resolve string machine names)
          console.log('Resolving line-us.local')
          dns.lookup('line-us.local', (err, addresses) => {
            if (err) {
              console.log(err)
              process.exit()
            }
            console.log(`Resolved IP to ${addresses}`)
            // If we've resolved the IP, connect.
            if (addresses && addresses.length) {
              console.log('Connecting to ', addresses)

              connection.connect({
                host: addresses,
                port: 1337,
                shellPrompt: /([^\r]+\r\n\0)/
              })
                .then(prompt => {
                  console.log(`Connected.`)
                  sendGCode()
                })
            } else {
              console.log('Could not resolve hostname.')
            }
          })
        })
        .catch(console.log)
    })
}
