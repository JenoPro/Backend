import express from 'express'
import {
  getAllAreas,
  getAreaById,
  getAreasByCity,
  getCities,
  getLocationsByCity
} from './areaController.js'

const router = express.Router()

// Public routes for area information
router.get('/', getAllAreas)
router.get('/cities', getCities)
router.get('/city/:city', getAreasByCity)
router.get('/locations/:city', getLocationsByCity)
router.get('/:id', getAreaById)

export default router
