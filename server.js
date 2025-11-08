const { createServer } = require('http')
const next = require('next')
const { parse } = require('url')

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT, 10) || 3010
const hostname = '0.0.0.0'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true)

      // Debug logging
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)

      handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Local: http://localhost:${port}`)
    console.log(`> Network: http://0.0.0.0:${port}`)
    console.log(`> External: http://31.56.56.39:${port}`)
  })
})