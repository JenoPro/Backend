import { createConnection } from '../../config/database.js'

// Get all available stalls for mobile app (restricted to applicant's applied areas)
export const getAllStalls = async (req, res) => {
  const connection = await createConnection()
  
  try {
    const { applicant_id } = req.query

    if (!applicant_id) {
      return res.status(400).json({
        success: false,
        message: 'Applicant ID is required'
      })
    }

    // First, get the areas where this applicant has applied
    const [appliedAreas] = await connection.execute(`
      SELECT DISTINCT b.area, b.branch_id, b.branch_name, b.location
      FROM application app
      JOIN stall st ON app.stall_id = st.stall_id
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      WHERE app.applicant_id = ?
    `, [applicant_id])

    if (appliedAreas.length === 0) {
      return res.json({
        success: true,
        message: 'No applications found. Please apply to a stall first to see available stalls in that area.',
        data: {
          all_stalls: [],
          stalls_by_type: { 'Fixed Price': [], 'Raffle': [], 'Auction': [] },
          stalls_by_area: {},
          total_count: 0,
          type_counts: { fixed: 0, raffle: 0, auction: 0 },
          applied_areas: [],
          restriction_message: 'Stalls are restricted to areas where you have applications'
        }
      })
    }

    // Build area filter conditions
    const areaConditions = appliedAreas.map(() => 'b.area = ?').join(' OR ')
    const areaValues = appliedAreas.map(area => area.area)

    // Get available stalls only in the areas where applicant has applied
    const [availableStalls] = await connection.execute(`
      SELECT 
        st.stall_id, st.stall_no, st.stall_location, st.size, st.rental_price, 
        st.price_type, st.status, st.description, st.stall_image, st.is_available,
        sec.section_name, sec.section_id, f.floor_name, f.floor_id, 
        b.branch_name, b.area, b.location, b.branch_id,
        CASE 
          WHEN app_check.stall_id IS NOT NULL THEN 'applied'
          ELSE 'available'
        END as application_status
      FROM stall st
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN application app_check ON st.stall_id = app_check.stall_id AND app_check.applicant_id = ?
      WHERE st.is_available = 1 AND st.status = 'Active' AND (${areaConditions})
      ORDER BY st.price_type, b.branch_name, f.floor_name, sec.section_name, st.stall_no
    `, [applicant_id, ...areaValues])

    // Format stalls for mobile app
    const formattedStalls = availableStalls.map(stall => ({
      id: stall.stall_id,
      stallNumber: stall.stall_no,
      location: stall.stall_location,
      size: stall.size,
      price: stall.rental_price ? stall.rental_price.toLocaleString() : '0',
      priceValue: stall.rental_price || 0,
      priceType: stall.price_type,
      status: stall.application_status,
      description: stall.description || 'No description available',
      image: stall.stall_image || 'https://oldspitalfieldsmarket.com/cms/2017/10/OSM_FP_Stall_sq-1440x1440.jpg',
      
      // Branch information
      branch: {
        id: stall.branch_id,
        name: stall.branch_name,
        area: stall.area,
        location: stall.location
      },
      
      // Floor and section info
      floor: stall.floor_name,
      section: stall.section_name,
      floorSection: `${stall.floor_name} / ${stall.section_name}`,
      
      // Application status
      canApply: stall.application_status === 'available',
      isApplied: stall.application_status === 'applied'
    }))

    // Group stalls by price type for easier mobile app consumption
    const stallsByType = {
      'Fixed Price': formattedStalls.filter(s => s.priceType === 'Fixed Price'),
      'Raffle': formattedStalls.filter(s => s.priceType === 'Raffle'),
      'Auction': formattedStalls.filter(s => s.priceType === 'Auction')
    }

    // Group stalls by area
    const stallsByArea = {}
    formattedStalls.forEach(stall => {
      if (!stallsByArea[stall.branch.area]) {
        stallsByArea[stall.branch.area] = []
      }
      stallsByArea[stall.branch.area].push(stall)
    })

    res.json({
      success: true,
      message: `Stalls retrieved successfully from your applied areas: ${appliedAreas.map(a => a.area).join(', ')}`,
      data: {
        all_stalls: formattedStalls,
        stalls_by_type: stallsByType,
        stalls_by_area: stallsByArea,
        total_count: formattedStalls.length,
        type_counts: {
          fixed: stallsByType['Fixed Price'].length,
          raffle: stallsByType['Raffle'].length,
          auction: stallsByType['Auction'].length
        },
        applied_areas: appliedAreas,
        restriction_info: {
          message: 'Stalls are restricted to areas where you have applications',
          areas_with_access: appliedAreas.map(area => area.area)
        }
      }
    })

  } catch (error) {
    console.error('Get all stalls error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stalls',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  } finally {
    await connection.end()
  }
}

// Get stalls by type (Fixed Price, Raffle, Auction) - restricted to applicant's applied areas
export const getStallsByType = async (req, res) => {
  const connection = await createConnection()
  
  try {
    const { type } = req.params
    const { applicant_id } = req.query

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Stall type is required'
      })
    }

    if (!applicant_id) {
      return res.status(400).json({
        success: false,
        message: 'Applicant ID is required'
      })
    }

    const validTypes = ['Fixed Price', 'Raffle', 'Auction']
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stall type. Must be: Fixed Price, Raffle, or Auction'
      })
    }

    // First, get the areas where this applicant has applied
    const [appliedAreas] = await connection.execute(`
      SELECT DISTINCT b.area, b.branch_id, b.branch_name, b.location
      FROM application app
      JOIN stall st ON app.stall_id = st.stall_id
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      WHERE app.applicant_id = ?
    `, [applicant_id])

    if (appliedAreas.length === 0) {
      return res.json({
        success: true,
        message: 'No applications found. Please apply to a stall first to see available stalls in that area.',
        data: {
          stalls: [],
          type: type,
          total_count: 0,
          available_count: 0,
          applied_count: 0,
          restriction_message: 'Stalls are restricted to areas where you have applications'
        }
      })
    }

    // Build area filter conditions
    const areaConditions = appliedAreas.map(() => 'b.area = ?').join(' OR ')
    const areaValues = appliedAreas.map(area => area.area)

    const [stalls] = await connection.execute(`
      SELECT 
        st.stall_id, st.stall_no, st.stall_location, st.size, st.rental_price, 
        st.price_type, st.status, st.description, st.stall_image, st.is_available,
        sec.section_name, sec.section_id, f.floor_name, f.floor_id, 
        b.branch_name, b.area, b.location, b.branch_id,
        CASE 
          WHEN app_check.stall_id IS NOT NULL THEN 'applied'
          ELSE 'available'
        END as application_status
      FROM stall st
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN application app_check ON st.stall_id = app_check.stall_id AND app_check.applicant_id = ?
      WHERE st.is_available = 1 AND st.status = 'Active' AND st.price_type = ? AND (${areaConditions})
      ORDER BY b.branch_name, f.floor_name, sec.section_name, st.stall_no
    `, [applicant_id, type, ...areaValues])

    // Format for mobile app
    const formattedStalls = stalls.map(stall => ({
      id: stall.stall_id,
      stallNumber: stall.stall_no,
      location: stall.stall_location,
      size: stall.size,
      price: stall.rental_price ? stall.rental_price.toLocaleString() : '0',
      priceValue: stall.rental_price || 0,
      priceType: stall.price_type,
      status: stall.application_status,
      description: stall.description || 'No description available',
      image: stall.stall_image || 'https://oldspitalfieldsmarket.com/cms/2017/10/OSM_FP_Stall_sq-1440x1440.jpg',
      
      // Branch information
      branch: {
        id: stall.branch_id,
        name: stall.branch_name,
        area: stall.area,
        location: stall.location
      },
      
      // Floor and section info
      floor: stall.floor_name,
      section: stall.section_name,
      floorSection: `${stall.floor_name} / ${stall.section_name}`,
      
      // Application status
      canApply: stall.application_status === 'available',
      isApplied: stall.application_status === 'applied',
      
      // Special fields for auction stalls
      ...(type === 'Auction' && {
        currentBid: stall.rental_price || 0,
        currentBidder: null,
        auctionDate: "To be announced",
        startTime: "To be announced"
      })
    }))

    res.json({
      success: true,
      message: `${type} stalls retrieved successfully from your applied areas: ${appliedAreas.map(a => a.area).join(', ')}`,
      data: {
        stalls: formattedStalls,
        type: type,
        total_count: formattedStalls.length,
        available_count: formattedStalls.filter(s => s.canApply).length,
        applied_count: formattedStalls.filter(s => s.isApplied).length,
        applied_areas: appliedAreas,
        restriction_info: {
          message: 'Stalls are restricted to areas where you have applications',
          areas_with_access: appliedAreas.map(area => area.area)
        }
      }
    })

  } catch (error) {
    console.error('Get stalls by type error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stalls by type',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  } finally {
    await connection.end()
  }
}

// Get stalls by area - restricted to applicant's applied areas
export const getStallsByArea = async (req, res) => {
  const connection = await createConnection()
  
  try {
    const { area } = req.params
    const { applicant_id, type } = req.query

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Area is required'
      })
    }

    if (!applicant_id) {
      return res.status(400).json({
        success: false,
        message: 'Applicant ID is required'
      })
    }

    // First, check if the applicant has applied to this area
    const [appliedAreas] = await connection.execute(`
      SELECT DISTINCT b.area, b.branch_id, b.branch_name, b.location
      FROM application app
      JOIN stall st ON app.stall_id = st.stall_id
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      WHERE app.applicant_id = ? AND b.area = ?
    `, [applicant_id, area])

    if (appliedAreas.length === 0) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You don't have applications in ${area}. You can only view stalls in areas where you have submitted applications.`,
        data: {
          requested_area: area,
          restriction_message: 'Stalls are restricted to areas where you have applications'
        }
      })
    }

    let query = `
      SELECT 
        st.stall_id, st.stall_no, st.stall_location, st.size, st.rental_price, 
        st.price_type, st.status, st.description, st.stall_image, st.is_available,
        sec.section_name, sec.section_id, f.floor_name, f.floor_id, 
        b.branch_name, b.area, b.location, b.branch_id,
        CASE 
          WHEN app_check.stall_id IS NOT NULL THEN 'applied'
          ELSE 'available'
        END as application_status
      FROM stall st
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN application app_check ON st.stall_id = app_check.stall_id AND app_check.applicant_id = ?
      WHERE st.is_available = 1 AND st.status = 'Active' AND b.area = ?`

    const queryParams = [applicant_id || null, area]

    // Add type filter if provided
    if (type) {
      query += ` AND st.price_type = ?`
      queryParams.push(type)
    }

    query += ` ORDER BY st.price_type, b.branch_name, f.floor_name, sec.section_name, st.stall_no`

    const [stalls] = await connection.execute(query, queryParams)

    // Format for mobile app
    const formattedStalls = stalls.map(stall => ({
      id: stall.stall_id,
      stallNumber: stall.stall_no,
      location: stall.stall_location,
      size: stall.size,
      price: stall.rental_price ? stall.rental_price.toLocaleString() : '0',
      priceValue: stall.rental_price || 0,
      priceType: stall.price_type,
      status: stall.application_status,
      description: stall.description || 'No description available',
      image: stall.stall_image || 'https://oldspitalfieldsmarket.com/cms/2017/10/OSM_FP_Stall_sq-1440x1440.jpg',
      
      // Branch information
      branch: {
        id: stall.branch_id,
        name: stall.branch_name,
        area: stall.area,
        location: stall.location
      },
      
      // Floor and section info
      floor: stall.floor_name,
      section: stall.section_name,
      floorSection: `${stall.floor_name} / ${stall.section_name}`,
      
      // Application status
      canApply: stall.application_status === 'available',
      isApplied: stall.application_status === 'applied'
    }))

    // Group by type
    const stallsByType = {
      'Fixed Price': formattedStalls.filter(s => s.priceType === 'Fixed Price'),
      'Raffle': formattedStalls.filter(s => s.priceType === 'Raffle'),
      'Auction': formattedStalls.filter(s => s.priceType === 'Auction')
    }

    res.json({
      success: true,
      message: `Stalls in ${area} retrieved successfully`,
      data: {
        stalls: formattedStalls,
        stalls_by_type: stallsByType,
        area: area,
        total_count: formattedStalls.length,
        type_counts: {
          fixed: stallsByType['Fixed Price'].length,
          raffle: stallsByType['Raffle'].length,
          auction: stallsByType['Auction'].length
        }
      }
    })

  } catch (error) {
    console.error('Get stalls by area error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stalls by area',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  } finally {
    await connection.end()
  }
}

// Get stall details by ID
export const getStallById = async (req, res) => {
  const connection = await createConnection()
  
  try {
    const { id } = req.params
    const { applicant_id } = req.query

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Stall ID is required'
      })
    }

    const [stallData] = await connection.execute(`
      SELECT 
        st.stall_id, st.stall_no, st.stall_location, st.size, st.rental_price, 
        st.price_type, st.status, st.description, st.stall_image, st.is_available,
        st.created_at, st.updated_at,
        sec.section_name, sec.section_id, f.floor_name, f.floor_id, 
        b.branch_name, b.area, b.location, b.branch_id, b.address as branch_address,
        CASE 
          WHEN app_check.stall_id IS NOT NULL THEN 'applied'
          ELSE 'available'
        END as application_status,
        app_check.application_id, app_check.application_date, app_check.application_status as app_status
      FROM stall st
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN application app_check ON st.stall_id = app_check.stall_id AND app_check.applicant_id = ?
      WHERE st.stall_id = ?
    `, [applicant_id || null, id])

    if (stallData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found'
      })
    }

    const stall = stallData[0]

    // Check application limits if applicant_id provided
    let applicationLimits = null
    if (applicant_id) {
      const [branchApplications] = await connection.execute(`
        SELECT COUNT(*) as count FROM application app
        JOIN stall st ON app.stall_id = st.stall_id
        JOIN section sec ON st.section_id = sec.section_id
        JOIN floor f ON sec.floor_id = f.floor_id
        JOIN branch b ON f.branch_id = b.branch_id
        WHERE app.applicant_id = ? AND b.branch_id = ?
      `, [applicant_id, stall.branch_id])

      applicationLimits = {
        current_applications_in_branch: branchApplications[0].count,
        max_applications_per_branch: 2,
        can_apply_more: branchApplications[0].count < 2
      }
    }

    // Format for mobile app
    const formattedStall = {
      id: stall.stall_id,
      stallNumber: stall.stall_no,
      location: stall.stall_location,
      size: stall.size,
      price: stall.rental_price ? stall.rental_price.toLocaleString() : '0',
      priceValue: stall.rental_price || 0,
      priceType: stall.price_type,
      status: stall.application_status,
      description: stall.description || 'No description available',
      image: stall.stall_image || 'https://oldspitalfieldsmarket.com/cms/2017/10/OSM_FP_Stall_sq-1440x1440.jpg',
      
      // Branch information
      branch: {
        id: stall.branch_id,
        name: stall.branch_name,
        area: stall.area,
        location: stall.location,
        address: stall.branch_address
      },
      
      // Floor and section info
      floor: stall.floor_name,
      section: stall.section_name,
      floorSection: `${stall.floor_name} / ${stall.section_name}`,
      
      // Application status
      canApply: stall.application_status === 'available' && 
                (applicationLimits ? applicationLimits.can_apply_more : true),
      isApplied: stall.application_status === 'applied',
      
      // Application details if applied
      ...(stall.application_status === 'applied' && {
        application: {
          id: stall.application_id,
          date: stall.application_date,
          status: stall.app_status
        }
      }),
      
      // Application limits info
      ...(applicationLimits && { application_limits: applicationLimits }),
      
      // Timestamps
      created_at: stall.created_at,
      updated_at: stall.updated_at,
      
      // Special fields for auction stalls
      ...(stall.price_type === 'Auction' && {
        currentBid: stall.rental_price || 0,
        currentBidder: null,
        auctionDate: "To be announced",
        startTime: "To be announced"
      })
    }

    res.json({
      success: true,
      message: 'Stall details retrieved successfully',
      data: formattedStall
    })

  } catch (error) {
    console.error('Get stall by ID error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stall details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  } finally {
    await connection.end()
  }
}

// Get available areas for stalls - only areas where applicant has applications
export const getAvailableAreas = async (req, res) => {
  const connection = await createConnection()
  
  try {
    const { applicant_id } = req.query

    if (!applicant_id) {
      return res.status(400).json({
        success: false,
        message: 'Applicant ID is required'
      })
    }

    // Get only areas where this applicant has applications
    const [areas] = await connection.execute(`
      SELECT DISTINCT b.area, b.location, COUNT(st.stall_id) as stall_count,
             COUNT(CASE WHEN st.is_available = 1 AND st.status = 'Active' THEN 1 END) as available_stall_count
      FROM application app
      JOIN stall st ON app.stall_id = st.stall_id
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      WHERE app.applicant_id = ? AND b.is_active = 1
      GROUP BY b.area, b.location
      ORDER BY b.area, b.location
    `, [applicant_id])

    if (areas.length === 0) {
      return res.json({
        success: true,
        message: 'No areas available. Please apply to a stall first to access areas.',
        data: {
          areas: [],
          total_areas: 0,
          restriction_message: 'Areas are restricted to where you have applications'
        }
      })
    }

    res.json({
      success: true,
      message: 'Available areas retrieved successfully (restricted to your applied areas)',
      data: {
        areas: areas.map(area => ({
          area: area.area,
          location: area.location,
          stall_count: area.stall_count,
          available_stall_count: area.available_stall_count
        })),
        total_areas: areas.length,
        restriction_info: {
          message: 'Areas are restricted to where you have applications',
          note: 'To access more areas, submit applications to stalls in those areas'
        }
      }
    })

  } catch (error) {
    console.error('Get available areas error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available areas',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  } finally {
    await connection.end()
  }
}

// Search stalls with filters - restricted to applicant's applied areas
export const searchStalls = async (req, res) => {
  const connection = await createConnection()
  
  try {
    const { 
      applicant_id, 
      type, 
      area, 
      min_price, 
      max_price, 
      size, 
      search_term 
    } = req.query

    if (!applicant_id) {
      return res.status(400).json({
        success: false,
        message: 'Applicant ID is required'
      })
    }

    // First, get the areas where this applicant has applied
    const [appliedAreas] = await connection.execute(`
      SELECT DISTINCT b.area, b.branch_id, b.branch_name, b.location
      FROM application app
      JOIN stall st ON app.stall_id = st.stall_id
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      WHERE app.applicant_id = ?
    `, [applicant_id])

    if (appliedAreas.length === 0) {
      return res.json({
        success: true,
        message: 'No applications found. Please apply to a stall first to search stalls in that area.',
        data: {
          stalls: [],
          total_count: 0,
          filters_applied: { type, area, min_price, max_price, size, search_term },
          restriction_message: 'Search is restricted to areas where you have applications'
        }
      })
    }

    // Build area filter conditions for applied areas
    const areaConditions = appliedAreas.map(() => 'b.area = ?').join(' OR ')
    const areaValues = appliedAreas.map(areaItem => areaItem.area)

    let query = `
      SELECT 
        st.stall_id, st.stall_no, st.stall_location, st.size, st.rental_price, 
        st.price_type, st.status, st.description, st.stall_image, st.is_available,
        sec.section_name, sec.section_id, f.floor_name, f.floor_id, 
        b.branch_name, b.area, b.location, b.branch_id,
        CASE 
          WHEN app_check.stall_id IS NOT NULL THEN 'applied'
          ELSE 'available'
        END as application_status
      FROM stall st
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN application app_check ON st.stall_id = app_check.stall_id AND app_check.applicant_id = ?
      WHERE st.is_available = 1 AND st.status = 'Active' AND (${areaConditions})`

    const queryParams = [applicant_id, ...areaValues]

    // Add additional filters
    if (type) {
      query += ` AND st.price_type = ?`
      queryParams.push(type)
    }

    // If area filter is specified, check if it's in applied areas
    if (area) {
      const hasAccessToArea = appliedAreas.some(appliedArea => appliedArea.area === area)
      if (!hasAccessToArea) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You don't have applications in ${area}. You can only search stalls in areas where you have submitted applications.`,
          data: {
            requested_area: area,
            available_areas: appliedAreas.map(a => a.area),
            restriction_message: 'Search is restricted to areas where you have applications'
          }
        })
      }
      query += ` AND b.area = ?`
      queryParams.push(area)
    }

    if (min_price) {
      query += ` AND st.rental_price >= ?`
      queryParams.push(parseFloat(min_price))
    }

    if (max_price) {
      query += ` AND st.rental_price <= ?`
      queryParams.push(parseFloat(max_price))
    }

    if (size) {
      query += ` AND st.size LIKE ?`
      queryParams.push(`%${size}%`)
    }

    if (search_term) {
      query += ` AND (st.stall_no LIKE ? OR st.description LIKE ? OR b.branch_name LIKE ?)`
      queryParams.push(`%${search_term}%`, `%${search_term}%`, `%${search_term}%`)
    }

    query += ` ORDER BY st.price_type, b.branch_name, f.floor_name, sec.section_name, st.stall_no`

    const [stalls] = await connection.execute(query, queryParams)

    // Format for mobile app
    const formattedStalls = stalls.map(stall => ({
      id: stall.stall_id,
      stallNumber: stall.stall_no,
      location: stall.stall_location,
      size: stall.size,
      price: stall.rental_price ? stall.rental_price.toLocaleString() : '0',
      priceValue: stall.rental_price || 0,
      priceType: stall.price_type,
      status: stall.application_status,
      description: stall.description || 'No description available',
      image: stall.stall_image || 'https://oldspitalfieldsmarket.com/cms/2017/10/OSM_FP_Stall_sq-1440x1440.jpg',
      
      // Branch information
      branch: {
        id: stall.branch_id,
        name: stall.branch_name,
        area: stall.area,
        location: stall.location
      },
      
      // Floor and section info
      floor: stall.floor_name,
      section: stall.section_name,
      floorSection: `${stall.floor_name} / ${stall.section_name}`,
      
      // Application status
      canApply: stall.application_status === 'available',
      isApplied: stall.application_status === 'applied'
    }))

    res.json({
      success: true,
      message: `Search results retrieved successfully from your applied areas: ${appliedAreas.map(a => a.area).join(', ')}`,
      data: {
        stalls: formattedStalls,
        total_count: formattedStalls.length,
        filters_applied: {
          type,
          area,
          min_price,
          max_price,
          size,
          search_term
        },
        applied_areas: appliedAreas,
        restriction_info: {
          message: 'Search is restricted to areas where you have applications',
          areas_with_access: appliedAreas.map(area => area.area)
        }
      }
    })

  } catch (error) {
    console.error('Search stalls error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to search stalls',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  } finally {
    await connection.end()
  }
}