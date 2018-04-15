const dns = require('dns')
const Telnet = require('telnet-client')
const fs = require('fs')
const { exec } = require('child_process')
const connection = new Telnet()
let gcode

connection.on('data', data => { console.log(`data - ${data}`) })
connection.on('ready', ready => { console.log(`ready - ${ready}`) })
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

const convertSVG = svg =>
  new Promise((resolve, reject) => {
    exec(`echo '${svg}' | node ./lib/svg2gcode --tooldiameter 1`, (err, stdout, stderr) => {
      if (err || stderr) {
        return reject(err || stderr)
      }
      return resolve(stdout)
    })
  })

const processGCode = () => {
  if (gcode.length) {
    let step = gcode.shift()
    console.log(`sending ${step}\x00`)
    connection.exec(`${step}\x00`, {
      shellPrompt: /(.+)/,
      stripShellPrompt: false
    })
      .then(rsp => {
        console.log('tr', rsp)
      })
  }
}

if (!fs.existsSync(svgPath)) {
  console.log(`Could not locate an SVG at ${svgPath}`)
  process.exit(1)
} else {
  // Optimize / clean the SVG.
  cleanSVG(svgPath)
    .then(cleanedSVG => {
      convertSVG(cleanedSVG.trim())
        .then(g => {
          // Set this
          gcode = g.split('\n')

          // The Line-Us runs at 'line-us.local'.
          // Find the IP address (because the telnet client can't resolve string machine names)
          dns.lookup('line-us.local', (err, addresses) => {
            if (err) {
              console.log(err)
              process.exit()
            }

            // If we've resolved the IP, connect.
            if (addresses && addresses.length) {
              console.log('Connecting to ', addresses)

              connection.connect({
                host: addresses,
                port: 1337,
                shellPrompt: /hello .+/
              })
                .then(prompt => {
                  console.log('Connected.')
                  processGCode()
                })
            } else {
              console.log('Could not resolve hostname.')
            }
          })
        })
        .catch(console.log)
    })
}
