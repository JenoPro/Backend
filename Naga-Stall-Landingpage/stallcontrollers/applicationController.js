import { createConnection } from "../config/database.js";

export const applicationController = {
  // Create a new stall application
  async createApplication(req, res) {
    let connection;

    try {
      connection = await createConnection();

      const { stall_id, applicant_id, application_date } = req.body;

      // Validate required fields
      if (!stall_id || !applicant_id) {
        return res.status(400).json({
          success: false,
          message: "Stall ID and Applicant ID are required",
        });
      }

      // Check if stall exists and is available
      const [stallRows] = await connection.execute(
        'SELECT * FROM stall WHERE stall_id = ? AND is_available = 1 AND status = "Active"',
        [stall_id]
      );

      if (stallRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Stall is not available or does not exist",
        });
      }

      // Check if applicant exists
      const [applicantRows] = await connection.execute(
        "SELECT * FROM applicant WHERE applicant_id = ?",
        [applicant_id]
      );

      if (applicantRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Applicant does not exist",
        });
      }

      // Check if applicant already has a pending/approved application for this stall
      const [existingApplication] = await connection.execute(
        `SELECT * FROM application 
         WHERE applicant_id = ? AND stall_id = ? 
         AND application_status IN ('Pending', 'Under Review', 'Approved')`,
        [applicant_id, stall_id]
      );

      if (existingApplication.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Applicant already has an active application for this stall",
        });
      }

      // Create the application
      const [result] = await connection.execute(
        `INSERT INTO application (stall_id, applicant_id, application_date, application_status)
         VALUES (?, ?, ?, 'Pending')`,
        [
          stall_id,
          applicant_id,
          application_date || new Date().toISOString().split("T")[0],
        ]
      );

      res.status(201).json({
        success: true,
        message: "Application submitted successfully",
        data: {
          application_id: result.insertId,
          stall_id,
          applicant_id,
          application_status: "Pending",
        },
      });
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create application",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Get all applications with applicant and stall details
  async getAllApplications(req, res) {
    let connection;

    try {
      connection = await createConnection();

      const { status, stall_id, applicant_id } = req.query;

      let query = `
        SELECT 
          app.*,
          a.applicant_full_name,
          a.applicant_contact_number,
          a.applicant_address,
          s.stall_no,
          s.rental_price,
          s.stall_location,
          s.section,
          s.floor
        FROM application app
        JOIN applicant a ON app.applicant_id = a.applicant_id
        JOIN stall s ON app.stall_id = s.stall_id
        WHERE 1=1
      `;

      const params = [];

      if (status) {
        query += " AND app.application_status = ?";
        params.push(status);
      }

      if (stall_id) {
        query += " AND app.stall_id = ?";
        params.push(stall_id);
      }

      if (applicant_id) {
        query += " AND app.applicant_id = ?";
        params.push(applicant_id);
      }

      query += " ORDER BY app.created_at DESC";

      const [applications] = await connection.execute(query, params);

      res.json({
        success: true,
        data: applications,
        count: applications.length,
      });
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch applications",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Get application by ID with full details
  async getApplicationById(req, res) {
    let connection;

    try {
      const { id } = req.params;
      connection = await createConnection();

      const [applications] = await connection.execute(
        `
        SELECT 
          app.*,
          a.*,
          s.*,
          bi.nature_of_business,
          bi.capitalization,
          bi.source_of_capital,
          bi.previous_business_experience,
          bi.relative_stall_owner,
          sp.spouse_full_name,
          sp.spouse_birthdate,
          sp.spouse_educational_attainment,
          sp.spouse_contact_number,
          sp.spouse_occupation,
          oi.signature_of_applicant,
          oi.house_sketch_location,
          oi.valid_id,
          oi.email_address
        FROM application app
        JOIN applicant a ON app.applicant_id = a.applicant_id
        JOIN stall s ON app.stall_id = s.stall_id
        LEFT JOIN business_information bi ON a.applicant_id = bi.applicant_id
        LEFT JOIN spouse sp ON a.applicant_id = sp.applicant_id
        LEFT JOIN other_information oi ON a.applicant_id = oi.applicant_id
        WHERE app.application_id = ?
      `,
        [id]
      );

      if (applications.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      res.json({
        success: true,
        data: applications[0],
      });
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch application",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Update application status
  async updateApplicationStatus(req, res) {
    let connection;

    try {
      const { id } = req.params;
      const { application_status } = req.body;

      // Validate status
      const validStatuses = ["Pending", "Approved", "Rejected", "Cancelled"];
      if (!validStatuses.includes(application_status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid application status",
        });
      }

      connection = await createConnection();
      await connection.beginTransaction();

      // Check if application exists
      const [existingApp] = await connection.execute(
        "SELECT * FROM application WHERE application_id = ?",
        [id]
      );

      if (existingApp.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      const application = existingApp[0];

      // Update application status
      await connection.execute(
        "UPDATE application SET application_status = ? WHERE application_id = ?",
        [application_status, id]
      );

      // If approved, make the stall unavailable
      if (application_status === "Approved") {
        await connection.execute(
          "UPDATE stall SET is_available = 0 WHERE stall_id = ?",
          [application.stall_id]
        );
      }

      // If rejected/cancelled, make sure stall is available (in case it was previously approved)
      if (
        application_status === "Rejected" ||
        application_status === "Cancelled"
      ) {
        await connection.execute(
          "UPDATE stall SET is_available = 1 WHERE stall_id = ?",
          [application.stall_id]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: "Application status updated successfully",
        data: {
          application_id: id,
          application_status,
        },
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error("Error updating application status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update application status",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Delete application
  async deleteApplication(req, res) {
    let connection;

    try {
      const { id } = req.params;
      connection = await createConnection();

      const [result] = await connection.execute(
        "DELETE FROM application WHERE application_id = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      res.json({
        success: true,
        message: "Application deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete application",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Get applications by status (for dashboard/admin view)
  async getApplicationsByStatus(req, res) {
    let connection;

    try {
      connection = await createConnection();

      const [statusCounts] = await connection.execute(`
        SELECT 
          application_status,
          COUNT(*) as count
        FROM application 
        GROUP BY application_status
      `);

      const [recentApplications] = await connection.execute(`
        SELECT 
          app.*,
          a.applicant_full_name,
          s.stall_no,
          s.stall_location
        FROM application app
        JOIN applicant a ON app.applicant_id = a.applicant_id
        JOIN stall s ON app.stall_id = s.stall_id
        ORDER BY app.created_at DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          status_counts: statusCounts,
          recent_applications: recentApplications,
        },
      });
    } catch (error) {
      console.error("Error fetching application statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch application statistics",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },
};