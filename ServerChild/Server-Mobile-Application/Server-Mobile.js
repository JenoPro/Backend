import express from 'express'
import cors from 'cors'
import loginRouter from '../../Naga-Stall-Mobile-Application/routes/loginRouter.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Mobile routes
app.use('/mobile', loginRouter)

// Health check for mobile
app.get('/mobile/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mobile backend is running',
    timestamp: new Date().toISOString()
  })
})

export default app
