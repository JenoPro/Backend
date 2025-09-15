import { createConnection } from "../config/database.js";

export const applicantController = {
  // Create a new applicant with all related information
  async createApplicant(req, res) {
    let connection;

    try {
      connection = await createConnection();
      await connection.beginTransaction();

      const {
        // Personal Information
        applicant_full_name,
        applicant_contact_number,
        applicant_address,
        applicant_birthdate,
        applicant_civil_status,
        applicant_educational_attainment,

        // Business Information
        nature_of_business,
        capitalization,
        source_of_capital,
        previous_business_experience,
        relative_stall_owner,

        // Spouse Information (optional)
        spouse_full_name,
        spouse_birthdate,
        spouse_educational_attainment,
        spouse_contact_number,
        spouse_occupation,

        // Other Information
        signature_of_applicant,
        house_sketch_location,
        valid_id,
        email_address,
      } = req.body;

      // Validate required fields
      if (!applicant_full_name || !applicant_contact_number) {
        return res.status(400).json({
          success: false,
          message: "Applicant name and contact number are required",
        });
      }

      // 1. Create applicant record
      const [applicantResult] = await connection.execute(
        `INSERT INTO applicant (
          applicant_full_name, applicant_contact_number, applicant_address, 
          applicant_birthdate, applicant_civil_status, applicant_educational_attainment
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          applicant_full_name,
          applicant_contact_number,
          applicant_address,
          applicant_birthdate,
          applicant_civil_status,
          applicant_educational_attainment,
        ]
      );

      const applicantId = applicantResult.insertId;

      // 2. Create business information if provided
      if (nature_of_business) {
        await connection.execute(
          `INSERT INTO business_information (
            applicant_id, nature_of_business, capitalization, 
            source_of_capital, previous_business_experience, relative_stall_owner
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            applicantId,
            nature_of_business,
            capitalization || null,
            source_of_capital,
            previous_business_experience,
            relative_stall_owner || "No",
          ]
        );
      }

      // 3. Create spouse information if married and spouse details provided
      if (applicant_civil_status === "Married" && spouse_full_name) {
        await connection.execute(
          `INSERT INTO spouse (
            applicant_id, spouse_full_name, spouse_birthdate, 
            spouse_educational_attainment, spouse_contact_number, spouse_occupation
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            applicantId,
            spouse_full_name,
            spouse_birthdate,
            spouse_educational_attainment,
            spouse_contact_number,
            spouse_occupation,
          ]
        );
      }

      // 4. Create other information
      await connection.execute(
        `INSERT INTO other_information (
          applicant_id, signature_of_applicant, house_sketch_location, 
          valid_id, email_address
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          applicantId,
          signature_of_applicant,
          house_sketch_location,
          valid_id,
          email_address,
        ]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Applicant created successfully",
        data: {
          applicant_id: applicantId,
          applicant_full_name,
          applicant_contact_number,
        },
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error("Error creating applicant:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create applicant",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Get all applicants
  async getAllApplicants(req, res) {
    let connection;

    try {
      connection = await createConnection();

      const [applicants] = await connection.execute(`
        SELECT 
          a.*,
          bi.nature_of_business,
          bi.capitalization,
          s.spouse_full_name,
          oi.email_address
        FROM applicant a
        LEFT JOIN business_information bi ON a.applicant_id = bi.applicant_id
        LEFT JOIN spouse s ON a.applicant_id = s.applicant_id
        LEFT JOIN other_information oi ON a.applicant_id = oi.applicant_id
        ORDER BY a.created_at DESC
      `);

      res.json({
        success: true,
        data: applicants,
        count: applicants.length,
      });
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch applicants",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Get applicant by ID with all related information
  async getApplicantById(req, res) {
    let connection;

    try {
      const { id } = req.params;
      connection = await createConnection();

      // Get applicant basic info
      const [applicantRows] = await connection.execute(
        "SELECT * FROM applicant WHERE applicant_id = ?",
        [id]
      );

      if (applicantRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Applicant not found",
        });
      }

      const applicant = applicantRows[0];

      // Get business information
      const [businessRows] = await connection.execute(
        "SELECT * FROM business_information WHERE applicant_id = ?",
        [id]
      );

      // Get spouse information
      const [spouseRows] = await connection.execute(
        "SELECT * FROM spouse WHERE applicant_id = ?",
        [id]
      );

      // Get other information
      const [otherRows] = await connection.execute(
        "SELECT * FROM other_information WHERE applicant_id = ?",
        [id]
      );

      res.json({
        success: true,
        data: {
          applicant,
          business_information: businessRows[0] || null,
          spouse: spouseRows[0] || null,
          other_information: otherRows[0] || null,
        },
      });
    } catch (error) {
      console.error("Error fetching applicant:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch applicant",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Update applicant information
  async updateApplicant(req, res) {
    let connection;

    try {
      const { id } = req.params;
      connection = await createConnection();

      // Check if applicant exists
      const [existingApplicant] = await connection.execute(
        "SELECT * FROM applicant WHERE applicant_id = ?",
        [id]
      );

      if (existingApplicant.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Applicant not found",
        });
      }

      const {
        applicant_full_name,
        applicant_contact_number,
        applicant_address,
        applicant_birthdate,
        applicant_civil_status,
        applicant_educational_attainment,
      } = req.body;

      await connection.execute(
        `UPDATE applicant SET 
          applicant_full_name = ?, applicant_contact_number = ?, 
          applicant_address = ?, applicant_birthdate = ?, 
          applicant_civil_status = ?, applicant_educational_attainment = ?
        WHERE applicant_id = ?`,
        [
          applicant_full_name,
          applicant_contact_number,
          applicant_address,
          applicant_birthdate,
          applicant_civil_status,
          applicant_educational_attainment,
          id,
        ]
      );

      res.json({
        success: true,
        message: "Applicant updated successfully",
      });
    } catch (error) {
      console.error("Error updating applicant:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update applicant",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Delete applicant (this will cascade delete related records)
  async deleteApplicant(req, res) {
    let connection;

    try {
      const { id } = req.params;
      connection = await createConnection();

      const [result] = await connection.execute(
        "DELETE FROM applicant WHERE applicant_id = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Applicant not found",
        });
      }

      res.json({
        success: true,
        message: "Applicant deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting applicant:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete applicant",
        error: error.message,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },
};