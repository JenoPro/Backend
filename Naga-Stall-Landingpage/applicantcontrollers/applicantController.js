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
      if (!applicant_full_name || !applicant_contact_number || !email_address) {
        return res.status(400).json({
          success: false,
          message: "Applicant name, contact number, and email address are required",
        });
      }

      // Check if email already exists - but allow resubmission in certain cases
      if (email_address) {
        const [existingEmail] = await connection.execute(`
          SELECT 
            oi.applicant_id, 
            a.applicant_full_name,
            app.application_status,
            a.created_at
          FROM other_information oi
          JOIN applicant a ON oi.applicant_id = a.applicant_id
          LEFT JOIN application app ON a.applicant_id = app.applicant_id
          WHERE oi.email_address = ?
          ORDER BY a.created_at DESC
          LIMIT 1
        `, [email_address]);

        if (existingEmail.length > 0) {
          const existing = existingEmail[0];
          const applicationStatus = existing.application_status;
          
          // Allow resubmission if:
          // 1. Previous application was declined/rejected
          // 2. No application exists (just applicant data)
          // 3. Application is older than 30 days and still pending
          const daysSinceCreation = Math.floor((Date.now() - new Date(existing.created_at)) / (1000 * 60 * 60 * 24));
          
          if (applicationStatus === 'Approved' || applicationStatus === 'approved') {
            return res.status(400).json({
              success: false,
              message: 'This email address is already associated with an approved application. Please contact support if you need assistance.'
            });
          } else if (applicationStatus === 'Pending' || applicationStatus === 'pending') {
            if (daysSinceCreation < 7) { // Block resubmission within 7 days if pending
              return res.status(400).json({
                success: false,
                message: `A recent application with this email address is still pending review (submitted ${daysSinceCreation} day(s) ago). Please wait for the review to complete or contact support.`
              });
            }
            // Allow resubmission if pending for more than 7 days
            console.log(`⚠️ Allowing resubmission for email ${email_address} - pending for ${daysSinceCreation} days`);
          }
          // Allow resubmission for declined/rejected applications or null status
          console.log(`✅ Allowing resubmission for email ${email_address} - status: ${applicationStatus || 'no application'}`);
        }
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

      // 5. If stall_id is provided, create the application as well (atomic operation)
      let applicationId = null;
      if (req.body.stall_id) {
        console.log(`🎯 Creating application for applicant ${applicantId} and stall ${req.body.stall_id}`);
        
        // Check if stall exists and is available
        const [stallRows] = await connection.execute(
          'SELECT * FROM stall WHERE stall_id = ? AND is_available = 1 AND status = "Active"',
          [req.body.stall_id]
        );

        if (stallRows.length === 0) {
          throw new Error("Stall is not available or does not exist");
        }

        // Create the application within the same transaction
        try {
          const [applicationResult] = await connection.execute(
            `INSERT INTO application (stall_id, applicant_id, application_date, application_status)
             VALUES (?, ?, ?, 'Pending')`,
            [
              req.body.stall_id,
              applicantId,
              req.body.application_date || new Date().toISOString().split("T")[0],
            ]
          );
          applicationId = applicationResult.insertId;
          console.log(`✅ Application created successfully with ID: ${applicationId}`);
        } catch (appError) {
          console.error("❌ Error creating application:", appError.message);
          throw new Error(`Failed to create application: ${appError.message}`);
        }
      }

      await connection.commit();
      console.log(`✅ Transaction committed successfully`);

      res.status(201).json({
        success: true,
        message: applicationId ? "Applicant and application created successfully" : "Applicant created successfully",
        data: {
          applicant_id: applicantId,
          application_id: applicationId,
          applicant_full_name,
          applicant_contact_number,
          stall_id: req.body.stall_id || null,
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

  // Create complete stall application (applicant + application in one atomic operation)
  async createStallApplication(req, res) {
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

        // Application Information
        stall_id,
        application_date,
      } = req.body;

      // Validate required fields
      if (!applicant_full_name || !applicant_contact_number || !email_address || !stall_id) {
        return res.status(400).json({
          success: false,
          message: "Applicant name, contact number, email address, and stall ID are required",
        });
      }

      // Enhanced email check with better logic
      const [existingEmail] = await connection.execute(`
        SELECT 
          oi.applicant_id, 
          a.applicant_full_name,
          app.application_status,
          a.created_at
        FROM other_information oi
        JOIN applicant a ON oi.applicant_id = a.applicant_id
        LEFT JOIN application app ON a.applicant_id = app.applicant_id
        WHERE oi.email_address = ?
        ORDER BY a.created_at DESC
        LIMIT 1
      `, [email_address]);

      if (existingEmail.length > 0) {
        const existing = existingEmail[0];
        const applicationStatus = existing.application_status;
        const daysSinceCreation = Math.floor((Date.now() - new Date(existing.created_at)) / (1000 * 60 * 60 * 24));
        
        if (applicationStatus === 'Approved' || applicationStatus === 'approved') {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'This email address is already associated with an approved application.'
          });
        } else if ((applicationStatus === 'Pending' || applicationStatus === 'pending') && daysSinceCreation < 1) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `A recent application with this email address is still pending review. Please wait or contact support.`
          });
        }
        
        console.log(`⚠️ Allowing resubmission for email ${email_address} - status: ${applicationStatus || 'no application'}, days: ${daysSinceCreation}`);
      }

      // Check if stall exists and is available
      const [stallRows] = await connection.execute(
        'SELECT * FROM stall WHERE stall_id = ? AND is_available = 1 AND status = "Active"',
        [stall_id]
      );

      if (stallRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Selected stall is not available or does not exist",
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
      console.log(`✅ Applicant created with ID: ${applicantId}`);

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

      // 5. Create the application
      let applicationId = null;
      try {
        const [applicationResult] = await connection.execute(
          `INSERT INTO application (stall_id, applicant_id, application_date, application_status)
           VALUES (?, ?, ?, 'Pending')`,
          [
            stall_id,
            applicantId,
            application_date || new Date().toISOString().split("T")[0],
          ]
        );
        applicationId = applicationResult.insertId;
        console.log(`✅ Application created with ID: ${applicationId}`);
      } catch (appError) {
        console.error("❌ Application creation failed:", appError.message);
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message: "Failed to submit application due to database constraints. Please try again or contact support.",
          error: appError.message,
        });
      }

      await connection.commit();
      console.log(`✅ Complete stall application transaction committed`);

      res.status(201).json({
        success: true,
        message: "Stall application submitted successfully",
        data: {
          applicant_id: applicantId,
          application_id: applicationId,
          applicant_full_name,
          applicant_contact_number,
          stall_id,
          application_status: "Pending",
        },
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        console.error("❌ Transaction rolled back due to error:", error.message);
      }
      console.error("Error creating stall application:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit stall application",
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