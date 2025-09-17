import bcrypt from 'bcrypt'

const { hash } = bcrypt

// Create Password Hash endpoint (for testing)
export async function createPasswordHash(req, res) {
  try {
    const { password } = req.body

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      })
    }

    const saltRounds = 12
    const hashedPassword = await hash(password, saltRounds)

    res.json({
      success: true,
      data: {
        originalPassword: password,
        hashedPassword: hashedPassword,
        instructions: 'Use this hash to update your database password field',
      },
    })
  } catch (error) {
    console.error('❌ Create password hash error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
}