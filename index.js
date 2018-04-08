const dns = require('dns')
const Telnet = require('telnet-client')
const fs = require('fs')
const SVGO = require('svgo')
const { exec } = require('child_process')

const connection = new Telnet()

if (process.argv.length < 3) {
  console.log(`Usage: node index.js PATH_TO_SVG`)
  process.exit(1)
}

const svgPath = process.argv[2]

if (!fs.existsSync(svgPath)) {
  console.log(`Could not locate an SVG at ${svgPath}`)
  process.exit(1)
} else {
  //let svg = fs.readFileSync(svgPath, {encoding: 'utf8'})
  // Optimize / clean the SVG.
  exec(`./node_modules/.bin/svgo --output=-  --pretty ${svgPath}`, (err, stdout, strerr) => {
    if (err || stderr) {
      console.log("Error while simplifying svg", err, stderr)
      process.exit(1)
    } 
    console.log('stdout', stdout)
  })

  
  // s.optimize(svg, {path: svgPath})
  //   .then(result => {
  //     console.log('result', result)
  //   })
  //   .catch(e => {
  //     console.log('e', e)
  //   })
  // console.log(s2g.runWithSVG(svg))
}

// process.exit()



// // The Line-Us runs at 'line-us.local'.
// // Find the IP address (because the telnet client can't resolve string machine names)
// dns.lookup('line-us.local', (err, addresses) => {
//   if (err) {
//     console.log(err)
//     process.exit()
//   }

//   // If we've resolved the
//   if (addresses && addresses.length) {
//     console.log('Connecting to ', addresses)
//     connect(addresses)
//       .then(prompt => {
//         console.log('Connected.', prompt)
//         // Convert SVG into GCode.
//         console.log(s2g.runWithSVG(svg))
//       })
//   } else {
//     console.log('Could not resolve local hostname.')
//   }
// })

// const connect = host => connection.connect({
//   host,
//   port: 1337,
//   shellPrompt: /hello .+/
// })
