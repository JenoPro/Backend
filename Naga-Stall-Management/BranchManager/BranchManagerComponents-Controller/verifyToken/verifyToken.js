import jwt from 'jsonwebtoken'

const { verify } = jwt

// Verify token controller
export async function verifyToken(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      })
    }

    const jwtSecret =
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
    const decoded = verify(token, jwtSecret)

    res.json({
      success: true,
      data: {
        user: {
          id: decoded.userId,
          username: decoded.username,
          userType: decoded.userType,
          area: decoded.area,
          location: decoded.location,
          branchManagerId: decoded.branchManagerId,
        },
      },
    })
  } catch (error) {
    console.error('Token verification error:', error)
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    })
  }
}