#!/usr/bin/env node

const program = require('commander')
const GCanvas = require('gcanvas')
const canvg = require('canvg')

/* eslint-disable */

program
  .version(require('../package.json').version)
  .usage('[options] <file ...>')
  .option('-s, --speed <number>', 'spindle speed', eval)
  .option('-f, --feed <number>', 'feed rate', eval)
  .option('-d, --depth <number>', 'z of final cut depth', eval)
  .option('-c, --depthofcut <number>', 'z offset of layered cuts', eval)
  .option('-t, --top <number>', 'z of top of work surface', eval)
  .option('-a, --above <number>', 'z of safe area above the work', eval)
  .option('-D, --tooldiameter <number>', 'diameter of tool', eval)
  .option('-p, --positive', 'Treat fill as positive, cutting only around the outside')
/* eslint-enable */

program.parse(process.argv)

var gctx = new GCanvas()

if (program.speed) gctx.speed = program.speed
if (program.feed) gctx.feed = program.feed
if (program.depth) gctx.depth = program.depth
if (program.depthofcut) gctx.depthOfCut = program.depthofcut
if (program.top) gctx.top = program.top
if (program.above) gctx.aboveTop = program.above
if (program.tooldiameter) gctx.toolDiameter = program.tooldiameter

if (program.positive) {
  gctx.fill = function (windingRule, depth) {
    gctx.save()
    gctx.strokeStyle = gctx.fillStyle
    gctx.stroke('outer', depth)
    gctx.restore()
  }
}

if (!process.stdin.isTTY) {
  let svg = []
  const stdin = process.stdin
  stdin.resume()
  stdin.setEncoding('utf8')

  stdin.on('data', data => {
    svg.push(data)
  })

  stdin.on('end', () => {
    svg = svg.join().trim()
    canvg(gctx.canvas, svg, {})
    console.log('M30')
    if (program.top > 0) {
      gctx.motion.rapid({ z: 0 })
    } else {
      gctx.motion.retract()
    }
    process.exit(0)
  })
}
