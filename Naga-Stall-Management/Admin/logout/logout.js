// Logout controller
export async function logout(req, res) {
  try {
    // Since we're using JWT tokens, logout is handled on the frontend
    // by removing the token from storage
    console.log('User logged out successfully')
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('❌ Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message,
    })
  }
}