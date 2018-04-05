'use strict'

const dns = require('dns')
const Telnet = require('telnet-client')

// The Line-Us runs at 'line-us.local'.
// Find the IP address (because the telnet client can't resolve string machine names)
dns.lookup('line-us.local', (err, addresses) => {
  if (err) {
    console.log(err)
    process.exit()
  }
  if (addresses && addresses.length) {
    connect(addresses)
  } else {
    console.log('Could not resolve local hostname.')
  }
})

async function connect (host) {
  const connection = new Telnet()

  const params = {
    host,
    port: 1337
  }

  console.log(`Connecting to ${host}`)
  await connection.connect(params)

  // let res = await connection.exec('uptime')
  // console.log('async result:', res)
}
