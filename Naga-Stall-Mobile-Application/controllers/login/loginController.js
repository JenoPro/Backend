import bcrypt from 'bcrypt'
import { createConnection } from '../../config/database.js'

// Mobile login for React.js app - fetch stalls by applicant's applied area
export const mobileLogin = async (req, res) => {
  const connection = await createConnection()
  
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      })
    }

    // Step 1: Get applicant credentials and basic info
    const [credentialRows] = await connection.execute(
      `SELECT 
         c.registrationid, c.applicant_id, c.user_name, c.password_hash, 
         c.is_active, c.created_date, c.last_login,
         a.applicant_full_name, a.applicant_contact_number, a.applicant_address,
         a.applicant_birthdate, a.applicant_civil_status, a.applicant_educational_attainment
       FROM credential c
       JOIN applicant a ON c.applicant_id = a.applicant_id
       WHERE c.user_name = ? AND c.is_active = 1`,
      [username]
    )

    if (credentialRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      })
    }

    const userCredentials = credentialRows[0]

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userCredentials.password_hash)
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      })
    }

    // Step 2: Get areas where this applicant has applied (to fetch relevant stalls)
    const [appliedAreas] = await connection.execute(
      `SELECT DISTINCT b.area, b.branch_id, b.branch_name, b.location
       FROM application app
       JOIN stall st ON app.stall_id = st.stall_id
       JOIN section sec ON st.section_id = sec.section_id
       JOIN floor f ON sec.floor_id = f.floor_id
       JOIN branch b ON f.branch_id = b.branch_id
       WHERE app.applicant_id = ?`,
      [userCredentials.applicant_id]
    )

    // If no applications yet, get all available areas
    let targetAreas = []
    if (appliedAreas.length === 0) {
      const [allAreas] = await connection.execute(
        `SELECT DISTINCT b.area, b.branch_id, b.branch_name, b.location
         FROM branch b
         WHERE b.is_active = 1
         ORDER BY b.area`
      )
      targetAreas = allAreas
    } else {
      targetAreas = appliedAreas
    }

    // Step 3: Get applicant's current applications with detailed info
    const [myApplications] = await connection.execute(
      `SELECT 
         app.application_id, app.stall_id, app.application_date, app.application_status,
         app.created_at, app.updated_at,
         st.stall_no, st.stall_location, st.size, st.rental_price, st.price_type,
         st.status as stall_status, st.description, st.stall_image,
         sec.section_name, f.floor_name, b.branch_name, b.area, b.location as branch_location,
         b.branch_id
       FROM application app
       JOIN stall st ON app.stall_id = st.stall_id
       JOIN section sec ON st.section_id = sec.section_id
       JOIN floor f ON st.floor_id = f.floor_id
       JOIN branch b ON f.branch_id = b.branch_id
       WHERE app.applicant_id = ?
       ORDER BY app.created_at DESC`,
      [userCredentials.applicant_id]
    )

    // Step 4: Count applications per branch (for 2-application limit)
    const branchApplicationCounts = {}
    myApplications.forEach(app => {
      const branchId = app.branch_id
      branchApplicationCounts[branchId] = (branchApplicationCounts[branchId] || 0) + 1
    })

    // Step 5: Get available stalls in the areas where applicant applied (or all areas if no applications)
    const areaConditions = targetAreas.map(() => 'b.area = ?').join(' OR ')
    const areaValues = targetAreas.map(area => area.area)

    let stallsQuery = `
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
      WHERE st.is_available = 1 AND st.status = 'Active'`

    if (areaValues.length > 0) {
      stallsQuery += ` AND (${areaConditions})`
    }

    stallsQuery += ' ORDER BY b.branch_name, f.floor_name, sec.section_name, st.stall_no'

    const queryParams = [userCredentials.applicant_id, ...areaValues]
    const [availableStalls] = await connection.execute(stallsQuery, queryParams)

    // Step 6: Add additional metadata for React components
    const stallsWithMetadata = availableStalls.map(stall => ({
      ...stall,
      can_apply: stall.application_status === 'available' && 
                 (branchApplicationCounts[stall.branch_id] || 0) < 2,
      applications_in_branch: branchApplicationCounts[stall.branch_id] || 0,
      max_applications_reached: (branchApplicationCounts[stall.branch_id] || 0) >= 2
    }))

    // Step 7: Get additional applicant information
    const [otherInfo] = await connection.execute(
      `SELECT oi.email_address, oi.signature_of_applicant, oi.house_sketch_location, oi.valid_id,
              bi.nature_of_business, bi.capitalization, bi.source_of_capital, 
              bi.previous_business_experience, bi.relative_stall_owner,
              s.spouse_full_name, s.spouse_birthdate, s.spouse_educational_attainment,
              s.spouse_contact_number, s.spouse_occupation
       FROM applicant a
       LEFT JOIN other_information oi ON a.applicant_id = oi.applicant_id
       LEFT JOIN business_information bi ON a.applicant_id = bi.applicant_id
       LEFT JOIN spouse s ON a.applicant_id = s.applicant_id
       WHERE a.applicant_id = ?`,
      [userCredentials.applicant_id]
    )

    const additionalInfo = otherInfo.length > 0 ? otherInfo[0] : {}

    // Step 8: Update last login
    await connection.execute(
      'UPDATE credential SET last_login = NOW() WHERE applicant_id = ?',
      [userCredentials.applicant_id]
    )

    // Step 9: Prepare React.js-friendly response
    const responseData = {
      // User profile for React state
      user: {
        applicant_id: userCredentials.applicant_id,
        registration_id: userCredentials.registrationid,
        username: userCredentials.user_name,
        full_name: userCredentials.applicant_full_name,
        contact_number: userCredentials.applicant_contact_number,
        address: userCredentials.applicant_address,
        birthdate: userCredentials.applicant_birthdate,
        civil_status: userCredentials.applicant_civil_status,
        educational_attainment: userCredentials.applicant_educational_attainment,
        email: additionalInfo.email_address || null, // Get email from other_information table
        created_date: userCredentials.created_date,
        last_login: new Date().toISOString()
      },

      // Additional profile information
      profile: {
        other_info: {
          email_address: additionalInfo.email_address,
          signature: additionalInfo.signature_of_applicant,
          house_sketch: additionalInfo.house_sketch_location,
          valid_id: additionalInfo.valid_id
        },
        business_info: {
          nature_of_business: additionalInfo.nature_of_business,
          capitalization: additionalInfo.capitalization,
          source_of_capital: additionalInfo.source_of_capital,
          previous_experience: additionalInfo.previous_business_experience,
          relative_stall_owner: additionalInfo.relative_stall_owner
        },
        spouse_info: additionalInfo.spouse_full_name ? {
          full_name: additionalInfo.spouse_full_name,
          birthdate: additionalInfo.spouse_birthdate,
          educational_attainment: additionalInfo.spouse_educational_attainment,
          contact_number: additionalInfo.spouse_contact_number,
          occupation: additionalInfo.spouse_occupation
        } : null
      },

      // Applications data for React components
      applications: {
        my_applications: myApplications,
        applications_count_by_branch: branchApplicationCounts,
        total_applications: myApplications.length
      },

      // Stalls data structured for React components
      stalls: {
        available_stalls: stallsWithMetadata,
        areas_applied: targetAreas,
        total_stalls: stallsWithMetadata.length,
        applicable_stalls: stallsWithMetadata.filter(stall => stall.can_apply).length
      },

      // UI state helpers for React
      ui_state: {
        can_apply_more: Object.values(branchApplicationCounts).some(count => count < 2),
        application_limits: {
          max_per_branch: 2,
          current_counts: branchApplicationCounts
        }
      }
    }

    res.json({
      success: true,
      message: 'Mobile login successful',
      data: responseData
    })

  } catch (error) {
    console.error('Mobile login error:', error)
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  } finally {
    await connection.end()
  }
}

// Submit application for mobile app (React.js)
export const submitApplication = async (req, res) => {
  const connection = await createConnection()
  
  try {
    const { applicant_id, stall_id } = req.body

    if (!applicant_id || !stall_id) {
      return res.status(400).json({
        success: false,
        message: 'Applicant ID and Stall ID are required'
      })
    }

    // Check if stall is available
    const [stallCheck] = await connection.execute(
      `SELECT st.stall_id, st.is_available, st.status, b.branch_id, b.branch_name
       FROM stall st
       JOIN section sec ON st.section_id = sec.section_id
       JOIN floor f ON sec.floor_id = f.floor_id
       JOIN branch b ON f.branch_id = b.branch_id
       WHERE st.stall_id = ?`,
      [stall_id]
    )

    if (stallCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found'
      })
    }

    const stall = stallCheck[0]

    if (!stall.is_available || stall.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Stall is not available for application'
      })
    }

    // Check if applicant already applied for this stall
    const [existingApplication] = await connection.execute(
      'SELECT application_id FROM application WHERE applicant_id = ? AND stall_id = ?',
      [applicant_id, stall_id]
    )

    if (existingApplication.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this stall'
      })
    }

    // Check 2-application limit per branch
    const [branchApplications] = await connection.execute(
      `SELECT COUNT(*) as count FROM application app
       JOIN stall st ON app.stall_id = st.stall_id
       JOIN section sec ON st.section_id = sec.section_id
       JOIN floor f ON sec.floor_id = f.floor_id
       JOIN branch b ON f.branch_id = b.branch_id
       WHERE app.applicant_id = ? AND b.branch_id = ?`,
      [applicant_id, stall.branch_id]
    )

    if (branchApplications[0].count >= 2) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum of 2 applications per branch (${stall.branch_name})`
      })
    }

    // Submit the application
    const [insertResult] = await connection.execute(
      `INSERT INTO application (applicant_id, stall_id, application_date, application_status, created_at, updated_at)
       VALUES (?, ?, NOW(), 'Pending', NOW(), NOW())`,
      [applicant_id, stall_id]
    )

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application_id: insertResult.insertId,
        stall_id: stall_id,
        applicant_id: applicant_id,
        status: 'Pending',
        submitted_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Submit application error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit application. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  } finally {
    await connection.end()
  }
}