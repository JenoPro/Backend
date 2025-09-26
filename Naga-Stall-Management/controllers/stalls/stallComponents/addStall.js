import { createConnection } from '../../../config/database.js'

// Add new stall (assigned to the authenticated branch manager)
export const addStall = async (req, res) => {
  let connection;
  try {
    // Get the branch manager ID from the authenticated user
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: "Branch manager ID not found in authentication token",
      });
    }

    console.log("Adding stall for branch manager ID:", branchManagerId);
    console.log("Frontend data received:", req.body);
    console.log("Available fields:", Object.keys(req.body));

    // Map frontend field names to backend field names - be flexible with field names
    const {
      stallNumber,
      stallNo = stallNumber,
      price,
      rental_price = price,
      floor,
      section,
      size,
      location,
      stall_location = location,
      description,
      image,
      stall_image = image,
      isAvailable = true,
      status,
      priceType = "Fixed Price",
      price_type = priceType,
    } = req.body;

    // Use the mapped values
    const stallNo_final = stallNo || stallNumber;
    const price_final = rental_price || price;
    const location_final = stall_location || location;
    const image_final = stall_image || image;
    const priceType_final = price_type || priceType || "Fixed Price";

    // More flexible validation - floor and section are not required since they don't exist in DB
    if (!stallNo_final || !price_final || !location_final || !size) {
      return res.status(400).json({
        success: false,
        message:
          "Required fields: stallNumber/stallNo, price/rental_price, location/stall_location, size",
        received: {
          stallNumber: !!stallNumber,
          stallNo: !!stallNo,
          price: !!price,
          rental_price: !!rental_price,
          location: !!location,
          stall_location: !!stall_location,
          size: !!size,
          floor: !!floor,
          section: !!section,
        },
        availableFields: Object.keys(req.body),
      });
    }

    connection = await createConnection();

    // Get the branch manager's branch_id and find the appropriate section
    const [branchInfo] = await connection.execute(
      `SELECT bm.branch_id, b.branch_name, b.area 
       FROM branch_manager bm
       INNER JOIN branch b ON bm.branch_id = b.branch_id
       WHERE bm.branch_manager_id = ?`,
      [branchManagerId]
    );

    if (!branchInfo || branchInfo.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Branch manager not found or not assigned to a branch",
      });
    }

    const managerBranchId = branchInfo[0].branch_id;
    const branchName = branchInfo[0].branch_name;
    console.log(
      `Branch manager ${branchManagerId} belongs to branch ${managerBranchId} (${branchName})`
    );

    // Find the first available section in the branch manager's branch
    const [availableSections] = await connection.execute(
      `SELECT sec.section_id, sec.section_name, f.floor_name 
       FROM section sec
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       WHERE f.branch_id = ?
       ORDER BY f.floor_number, sec.section_name
       LIMIT 1`,
      [managerBranchId]
    );

    if (!availableSections || availableSections.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No sections found for branch ${branchName}. Please create floors and sections first.`,
      });
    }

    const targetSectionId = availableSections[0].section_id;
    console.log(
      `Using section_id ${targetSectionId} (${availableSections[0].section_name}) in branch ${branchName}`
    );

    // Check if stall number already exists for this branch manager
    const [existingStall] = await connection.execute(
      `SELECT s.stall_id 
       FROM stall s
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
       INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
       WHERE s.stall_no = ? AND bm.branch_manager_id = ?`,
      [stallNo_final, branchManagerId]
    );

    if (existingStall.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Stall number ${stallNo_final} already exists in your branch`,
      });
    }

    // Map frontend fields to database columns
    const stallData = {
      stall_no: stallNo_final,
      stall_location: location_final,
      size: size,
      section_id: targetSectionId,
      rental_price: parseFloat(price_final),
      price_type: priceType_final,
      status: isAvailable !== false ? "Active" : "Inactive",
      stamp: "APPROVED",
      description: description || null,
      stall_image: image_final || null,
      is_available: isAvailable !== false ? 1 : 0,
    };

    console.log("Mapped database data:", stallData);

    // Insert new stall with proper section_id
    const [result] = await connection.execute(
      `INSERT INTO stall (
        stall_no, stall_location, size, section_id, rental_price, 
        price_type, status, stamp, description, stall_image, is_available, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        stallData.stall_no,
        stallData.stall_location,
        stallData.size,
        stallData.section_id,
        stallData.rental_price,
        stallData.price_type,
        stallData.status,
        stallData.stamp,
        stallData.description,
        stallData.stall_image,
        stallData.is_available,
      ]
    );

    const stallId = result.insertId;
    console.log("✅ Stall created with ID:", stallId);

    res.status(201).json({
      success: true,
      message: "Stall added successfully",
      data: {
        id: stallId,
        ...stallData,
        section_name: availableSections[0].section_name,
        branch_name: branchName,
      },
    });

  } catch (error) {
    console.error("❌ Add stall error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add stall",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};