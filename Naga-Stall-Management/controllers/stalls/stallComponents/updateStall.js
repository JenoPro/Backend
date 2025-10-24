import { createConnection } from "../../../config/database.js";

// Update stall (for branch managers and employees with stalls permission)
export const updateStall = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userType = req.user?.userType || req.user?.role;
    const userId = req.user?.userId;

    console.log("🔄 UPDATE STALL DEBUG:");
    console.log("- Stall ID:", id);
    console.log("- User Type:", userType);
    console.log("- User ID:", userId);
    console.log("- Update data:", updateData);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in authentication token",
      });
    }

    // Authorization check based on user type
    if (userType === "branch_manager" || userType === "branch-manager") {
      // Branch manager authorization (existing logic)
      console.log("🔍 Authorizing branch manager for stall update");
    } else if (userType === "employee") {
      // Employee authorization - check permissions
      const permissions = req.user?.permissions || [];
      const hasStallsPermission = Array.isArray(permissions)
        ? permissions.includes("stalls")
        : permissions.stalls || false;

      console.log("🔍 Employee permission check for stall update:", {
        permissions,
        hasStallsPermission,
      });

      if (!hasStallsPermission) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Employee does not have stalls permission for updating.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: `Access denied. User type '${userType}' cannot update stalls.`,
      });
    }

    connection = await createConnection();

    // Check if stall exists and user has permission to update it
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
        message: "Stall not found or you do not have permission to update it",
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    // Map frontend fields to database fields
    if (updateData.stallNo || updateData.stallNumber) {
      updateFields.push("stall_no = ?");
      updateValues.push(updateData.stallNo || updateData.stallNumber);
    }

    if (updateData.stall_location || updateData.location) {
      updateFields.push("stall_location = ?");
      updateValues.push(updateData.stall_location || updateData.location);
    }

    if (updateData.size) {
      updateFields.push("size = ?");
      updateValues.push(updateData.size);
    }

    if (updateData.rental_price || updateData.price) {
      updateFields.push("rental_price = ?");
      updateValues.push(
        parseFloat(updateData.rental_price || updateData.price)
      );
    }

    if (updateData.price_type || updateData.priceType) {
      updateFields.push("price_type = ?");
      updateValues.push(updateData.price_type || updateData.priceType);
    }

    if (updateData.status) {
      updateFields.push("status = ?");
      updateValues.push(updateData.status);
    }

    if (updateData.description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(updateData.description);
    }

    if (updateData.stall_image || updateData.image) {
      updateFields.push("stall_image = ?");
      updateValues.push(updateData.stall_image || updateData.image);
    }

    if (
      updateData.is_available !== undefined ||
      updateData.isAvailable !== undefined
    ) {
      const isAvailable =
        updateData.is_available !== undefined
          ? updateData.is_available
          : updateData.isAvailable;
      updateFields.push("is_available = ?");
      updateValues.push(isAvailable ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    // Add updated_at timestamp
    updateFields.push("updated_at = NOW()");
    updateValues.push(id);

    const updateQuery = `UPDATE stall SET ${updateFields.join(
      ", "
    )} WHERE stall_id = ?`;

    await connection.execute(updateQuery, updateValues);

    // Get updated stall data
    const [updatedStall] = await connection.execute(
      `SELECT 
        s.*,
        s.stall_id as id,
        sec.section_name,
        f.floor_name,
        b.branch_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      WHERE s.stall_id = ?`,
      [id]
    );

    console.log(
      `✅ Stall updated successfully by ${userType}:`,
      existingStall[0].stall_no
    );

    res.json({
      success: true,
      message: "Stall updated successfully",
      data: updatedStall[0],
    });
  } catch (error) {
    console.error("❌ Update stall error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update stall",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};
