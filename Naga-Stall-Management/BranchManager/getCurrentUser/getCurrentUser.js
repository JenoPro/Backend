// Get current user info controller
export async function getCurrentUser(req, res) {
  try {
    // The user info should be available from the auth middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          username: req.user.username,
          userType: req.user.userType,
          area: req.user.area,
          location: req.user.location,
          branchManagerId: req.user.branchManagerId,
        },
      },
    })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
}