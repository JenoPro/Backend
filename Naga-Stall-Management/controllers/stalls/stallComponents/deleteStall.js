import { createConnection } from "../../../config/database.js";

// Delete stall (for branch managers and employees with stalls permission)
export const deleteStall = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const userType = req.user?.userType || req.user?.role;
    const userId = req.user?.userId;

    console.log("🗑️ DELETE STALL DEBUG:");
    console.log("- Stall ID:", id);
    console.log("- User Type:", userType);
    console.log("- User ID:", userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in authentication token",
      });
    }

    // Authorization check based on user type
    if (userType === "branch_manager" || userType === "branch-manager") {
      // Branch manager authorization (existing logic)
      console.log("🔍 Authorizing branch manager for stall deletion");
    } else if (userType === "employee") {
      // Employee authorization - check permissions
      const permissions = req.user?.permissions || [];
      const hasStallsPermission = Array.isArray(permissions)
        ? permissions.includes("stalls")
        : permissions.stalls || false;

      console.log("🔍 Employee permission check for stall deletion:", {
        permissions,
        hasStallsPermission,
      });

      if (!hasStallsPermission) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Employee does not have stalls permission for deleting.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: `Access denied. User type '${userType}' cannot delete stalls.`,
      });
    }

    connection = await createConnection();

    // Check if stall exists and user has permission to delete it
    let stallQuery, stallParams;

    if (userType === "branch_manager" || userType === "branch-manager") {
      // Branch manager: Check if stall belongs to their branch
      const branchManagerId = req.user?.branchManagerId || userId;
      stallQuery = `SELECT s.stall_id, s.stall_no 
                   FROM stall s
                   INNER JOIN section sec ON s.section_id = sec.section_id
                   INNER JOIN floor f ON sec.floor_id = f.floor_id
                   INNER JOIN branch b ON f.branch_id = b.branch_id
                   INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
                   WHERE s.stall_id = ? AND bm.branch_manager_id = ?`;
      stallParams = [id, branchManagerId];
    } else if (userType === "employee") {
      // Employee: Check if stall belongs to their branch
      const branchId = req.user?.branchId;
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "Branch ID not found for employee",
        });
      }
      stallQuery = `SELECT s.stall_id, s.stall_no 
                   FROM stall s
                   INNER JOIN section sec ON s.section_id = sec.section_id
                   INNER JOIN floor f ON sec.floor_id = f.floor_id
                   INNER JOIN branch b ON f.branch_id = b.branch_id
                   WHERE s.stall_id = ? AND b.branch_id = ?`;
      stallParams = [id, branchId];
    }

    const [existingStall] = await connection.execute(stallQuery, stallParams);

    if (existingStall.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stall not found or you do not have permission to delete it",
      });
    }

    // Instead of hard delete, use soft delete to preserve data integrity
    // Check if stall has related records that prevent deletion
    try {
      // First, try to find related records
      const [relatedRecords] = await connection.execute(
        `SELECT 
          (SELECT COUNT(*) FROM violation_report WHERE stall_id = ?) as violation_count,
          (SELECT COUNT(*) FROM application WHERE stall_id = ?) as application_count`,
        [id, id]
      );

      const hasRelatedData =
        relatedRecords[0].violation_count > 0 ||
        relatedRecords[0].application_count > 0;

      console.log("🔍 Related data check:", {
        violations: relatedRecords[0].violation_count,
        applications: relatedRecords[0].application_count,
        hasRelatedData,
      });

      if (hasRelatedData) {
        // Soft delete: Mark as deleted/inactive instead of removing
        await connection.execute(
          `UPDATE stall SET 
            status = 'Inactive',
            is_available = 0,
            updated_at = NOW()
          WHERE stall_id = ?`,
          [id]
        );

        console.log(
          `✅ Stall soft-deleted successfully by ${userType}:`,
          existingStall[0].stall_no
        );

        res.json({
          success: true,
          message: "Stall removed successfully (archived due to related data)",
          data: {
            id: id,
            stallNumber: existingStall[0].stall_no,
            deleteType: "soft",
            reason: "Has related violation reports or applicant data",
          },
        });
      } else {
        // Hard delete if no related records
        await connection.execute("DELETE FROM stall WHERE stall_id = ?", [id]);

        console.log(
          `✅ Stall hard-deleted successfully by ${userType}:`,
          existingStall[0].stall_no
        );

        res.json({
          success: true,
          message: "Stall deleted successfully",
          data: {
            id: id,
            stallNumber: existingStall[0].stall_no,
            deleteType: "hard",
          },
        });
      }
    } catch (deleteError) {
      // If constraint error occurs, fall back to soft delete
      if (deleteError.code === "ER_ROW_IS_REFERENCED_2") {
        console.log("🔄 Constraint error detected, performing soft delete...");

        await connection.execute(
          `UPDATE stall SET 
            status = 'Inactive',
            is_available = 0,
            updated_at = NOW()
          WHERE stall_id = ?`,
          [id]
        );

        console.log(
          `✅ Stall soft-deleted successfully by ${userType}:`,
          existingStall[0].stall_no
        );

        res.json({
          success: true,
          message:
            "Stall removed successfully (archived due to database constraints)",
          data: {
            id: id,
            stallNumber: existingStall[0].stall_no,
            deleteType: "soft",
            reason: "Has related data that prevents deletion",
          },
        });
      } else {
        throw deleteError; // Re-throw if it's a different error
      }
    }
  } catch (error) {
    console.error("❌ Delete stall error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete stall",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};
