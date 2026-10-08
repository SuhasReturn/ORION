import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { prisma } from './lib/prisma.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 5000

app.use(cors())
app.use(express.json())

app.get('/', (_request, response) => {
  response.json({
    success: true,
    message: 'ORION backend is running',
  })
})

app.get('/api/health', (_request, response) => {
  response.json({
    success: true,
    status: 'healthy',
  })
})

app.get('/api/health/database', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`

    response.json({
      success: true,
      status: 'healthy',
      database: 'sqlite',
      message: 'ORION local database connection is healthy',
    })
  } catch (error) {
    console.error('Database health check failed:', error)

    response.status(503).json({
      success: false,
      status: 'unhealthy',
      database: 'sqlite',
      message: 'ORION local database connection could not be established',
    })
  }
})

app.listen(port, () => {
  console.log(`ORION backend is running at http://localhost:${port}`)
})
