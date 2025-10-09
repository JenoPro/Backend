import express from 'express'
import { mobileLogin, submitApplication } from '../controllers/login/loginController.js'

const router = express.Router()

// Mobile login route - POST /mobile-login
router.post('/mobile-login', mobileLogin)

// Mobile application submission route - POST /submit-application
router.post('/submit-application', submitApplication)

export default router