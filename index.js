const dns = require('dns')
const Telnet = require('telnet-client')
const fs = require('fs')
const { exec } = require('child_process')
const connection = new Telnet()
let gcode

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
            obj = {...obj, ...o2}
          })
          return obj
        })
      return resolve(gcode)
    })
  })

// // Manipulates gcode to fit within the line-us printable boundaries.
// const processGCode = gcode => {
//   //
// }

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
          gcode = g

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
