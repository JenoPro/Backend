import express from 'express'
import { getUserProfile, updateUserProfile } from '../controllers/user/userController.js'
import { authenticateToken, verifyUserExists } from '../middleware/auth.js'

const router = express.Router()

// All user routes require authentication
router.use(authenticateToken)
router.use(verifyUserExists)

// User profile routes
router.get('/profile', getUserProfile)
router.put('/profile', updateUserProfile)

export default router