import { createConnection } from '../../../config/database.js'

// Delete applicant
export const deleteApplicant = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await createConnection();

    // Check if applicant exists
    const [existingApplicant] = await connection.execute(
      'SELECT applicant_id, first_name, last_name, email FROM applicant WHERE applicant_id = ?',
      [id]
    );

    if (existingApplicant.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    // Delete the applicant
    await connection.execute('DELETE FROM applicant WHERE applicant_id = ?', [id]);

    console.log('✅ Applicant deleted successfully:', existingApplicant[0].email);

    res.json({
      success: true,
      message: 'Applicant deleted successfully',
      data: {
        id: id,
        name: `${existingApplicant[0].first_name} ${existingApplicant[0].last_name}`,
        email: existingApplicant[0].email
      }
    });

  } catch (error) {
    console.error('❌ Delete applicant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete applicant',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};