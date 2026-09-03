import { describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import { wsHandler } from './index'

describe('WebSocket Server Integration', () => {
  it('should export wsHandler with handleUpgrade method', () => {
    expect(wsHandler).toBeDefined()
    expect(wsHandler.handleUpgrade).toBeInstanceOf(Function)
  })

  it('should attach to node http server upgrade event', async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200)
      res.end('ok')
    })

    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
      if (url.pathname === '/ws') {
        wsHandler.handleUpgrade(req, socket, head)
      } else {
        socket.destroy()
      }
    })

    await new Promise<void>((resolve) => server.listen(0, resolve))
    // SAFETY: server.address() returns an AddressInfo object with port when listening
    const port = (server.address() as { port: number }).port
    expect(port).toBeGreaterThan(0)

    server.close()
  })
})
