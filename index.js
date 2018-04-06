'use strict'

const dns = require('dns')
const Telnet = require('telnet-client')
const connection = new Telnet()

// The Line-Us runs at 'line-us.local'.
// Find the IP address (because the telnet client can't resolve string machine names)
dns.lookup('line-us.local', (err, addresses) => {
  if (err) {
    console.log(err)
    process.exit()
  }

  //
  if (addresses && addresses.length) {
    console.log('Connecting to ', addresses)
    connect(addresses)
      .then(prompt => {
        console.log('Connected.', prompt)
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
