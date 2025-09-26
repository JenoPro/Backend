import bcrypt from 'bcrypt'

// Create password hash (utility function)
export const createPasswordHash = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    res.json({
      success: true,
      message: 'Password hash created',
      data: {
        original: password,
        hash: hash
      }
    });

  } catch (error) {
    console.error('❌ Create password hash error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create password hash',
      error: error.message
    });
  }
};