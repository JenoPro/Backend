import { createConnection } from '../../../config/database.js'

// Add new stall (assigned to the authenticated branch manager)
export const addStall = async (req, res) => {
  console.log("🔥 UPDATED ADDSTALL FUNCTION CALLED - VERSION 2.1 with DEADLINE SYSTEM");
  console.log("🔍 Request body received:", JSON.stringify(req.body, null, 2));
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
      stallNo,
      price,
      rental_price,
      floor_id,
      floor,
      floorId,  // Added: Frontend sends 'floorId'
      section_id,
      section,
      sectionId,  // Added: Frontend sends 'sectionId'
      size,
      location,
      stall_location,
      description,
      image,
      stall_image,
      isAvailable = true,
      status,
      priceType = "Fixed Price",
      price_type,
      // UPDATED: Raffle/Auction deadline fields (replaced duration)
      deadline,  // New: deadline as datetime string
      applicationDeadline, // Alternative field name
      startingPrice // Only for auctions
    } = req.body;

    // Use the mapped values with multiple fallbacks
    const stallNo_final = stallNo || stallNumber;
    const price_final = rental_price || price;
    const location_final = stall_location || location;
    const image_final = stall_image || image;
    const priceType_final = price_type || priceType || "Fixed Price";
    const floor_id_final = floor_id || floor || floorId;  // Updated: Include floorId
    const section_id_final = section_id || section || sectionId;  // Updated: Include sectionId
    
    // UPDATED: Handle deadline for raffle/auction (replaced duration)
    const deadline_final = deadline || applicationDeadline;
    
    // Validate deadline for raffle/auction
    if ((priceType_final === "Raffle" || priceType_final === "Auction") && !deadline_final) {
      return res.status(400).json({
        success: false,
        message: `Deadline is required for ${priceType_final} stalls. Please provide a deadline date and time.`
      });
    }
    
    // Validate deadline format and ensure it's in the future
    let parsedDeadline = null;
    if (deadline_final) {
      parsedDeadline = new Date(deadline_final);
      if (isNaN(parsedDeadline.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deadline format. Please provide a valid date and time.'
        });
      }
      
      if (parsedDeadline <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Deadline must be in the future.'
        });
      }
    }
    
    // Validate price type
    const validPriceTypes = ["Fixed Price", "Raffle", "Auction"];
    if (!validPriceTypes.includes(priceType_final)) {
      return res.status(400).json({
        success: false,
        message: `Invalid price type. Must be one of: ${validPriceTypes.join(', ')}`
      });
    }
    
    // For auction, starting price might be different from rental price
    const finalPrice = priceType_final === "Auction" && startingPrice 
      ? parseFloat(startingPrice) 
      : parseFloat(price_final);

    // ✅ MOVED: Now log the mapped values AFTER they're declared
    console.log("Mapped values:", {
      stallNo_final,
      price_final, 
      location_final,
      floor_id_final,
      section_id_final,
      priceType_final,
      deadline_final: deadline_final || 'Not applicable',
      finalPrice
    });

    // Updated validation - require deadline for raffle/auction
    let validationErrors = [];
    if (!stallNo_final) validationErrors.push("stallNumber/stallNo");
    if (!finalPrice || finalPrice <= 0) validationErrors.push("price/rental_price/startingPrice");
    if (!location_final) validationErrors.push("location/stall_location");
    if (!size) validationErrors.push("size");
    if (!floor_id_final) validationErrors.push("floor_id/floor/floorId");
    if (!section_id_final) validationErrors.push("section_id/section/sectionId");
    
    // For raffle/auction, deadline is required
    if ((priceType_final === "Raffle" || priceType_final === "Auction") && !deadline_final) {
      validationErrors.push("deadline/applicationDeadline (required for raffle/auction)");
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing or invalid required fields: ${validationErrors.join(', ')}`,
        received: {
          stallNumber: !!stallNumber,
          stallNo: !!stallNo,
          price: !!price,
          rental_price: !!rental_price,
          startingPrice: !!startingPrice,
          location: !!location,
          stall_location: !!stall_location,
          size: !!size,
          floor_id: !!floor_id_final,
          section_id: !!section_id_final,
          priceType: priceType_final,
          deadline: !!deadline_final,
          floorId: !!floorId,
          sectionId: !!sectionId,
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

    // Validate that the provided floor and section belong to this branch manager's branch
    const [floorSectionCheck] = await connection.execute(
      `SELECT s.section_id, s.section_name, f.floor_id, f.floor_name 
       FROM section s
       INNER JOIN floor f ON s.floor_id = f.floor_id
       WHERE f.branch_id = ? AND f.floor_id = ? AND s.section_id = ?`,
      [managerBranchId, floor_id_final, section_id_final]
    );

    if (!floorSectionCheck || floorSectionCheck.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid floor (${floor_id_final}) or section (${section_id_final}) for branch ${branchName}. Please select a valid floor and section.`,
      });
    }

    const targetFloorId = floorSectionCheck[0].floor_id;
    const targetSectionId = floorSectionCheck[0].section_id;
    const floorName = floorSectionCheck[0].floor_name;
    const sectionName = floorSectionCheck[0].section_name;
    
    console.log(
      `Using floor_id ${targetFloorId} (${floorName}) and section_id ${targetSectionId} (${sectionName}) in branch ${branchName}`
    );

    // Check if stall number already exists on the same floor (updated logic)
    const [existingStall] = await connection.execute(
      `SELECT s.stall_id, f.floor_name
       FROM stall s
       INNER JOIN floor f ON s.floor_id = f.floor_id
       WHERE s.stall_no = ? AND s.floor_id = ?`,
      [stallNo_final, targetFloorId]
    );

    if (existingStall.length > 0) {
      console.log("🚨 STALL DUPLICATE CHECK - NEW FLOOR-BASED LOGIC");
      console.log("Existing stall found:", existingStall);
      console.log("Checking stall_no:", stallNo_final, "on floor_id:", targetFloorId);
      return res.status(400).json({
        success: false,
        message: `Stall number ${stallNo_final} already exists on ${floorName}. Please choose a different stall number for this floor.`,
      });
    }

    // Map frontend fields to database columns
    const stallData = {
      stall_no: stallNo_final,
      stall_location: location_final,
      size: size,
      floor_id: targetFloorId,
      section_id: targetSectionId,
      rental_price: finalPrice,
      price_type: priceType_final,
      status: isAvailable !== false ? "Active" : "Inactive",
      stamp: "APPROVED",
      description: description || null,
      stall_image: image_final || null,
      is_available: isAvailable !== false ? 1 : 0,
      // UPDATED: Raffle/Auction deadline fields (replaced duration)
      raffle_auction_deadline: (priceType_final === "Raffle" || priceType_final === "Auction") ? parsedDeadline : null,
      deadline_active: 0, // Initially false, will be activated when first applicant applies
      raffle_auction_status: (priceType_final === "Raffle" || priceType_final === "Auction") ? "Not Started" : "Not Started",
      created_by_manager: branchManagerId
    };

    console.log("Mapped database data:", stallData);

    // Insert new stall with proper floor_id and section_id
    const [result] = await connection.execute(
      `INSERT INTO stall (
        stall_no, stall_location, size, floor_id, section_id, rental_price, 
        price_type, status, stamp, description, stall_image, is_available, 
        raffle_auction_deadline, deadline_active, raffle_auction_status, created_by_manager, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        stallData.stall_no,
        stallData.stall_location,
        stallData.size,
        stallData.floor_id,
        stallData.section_id,
        stallData.rental_price,
        stallData.price_type,
        stallData.status,
        stallData.stamp,
        stallData.description,
        stallData.stall_image,
        stallData.is_available,
        stallData.raffle_auction_deadline,
        stallData.deadline_active,
        stallData.raffle_auction_status,
        stallData.created_by_manager,
      ]
    );

    const stallId = result.insertId;
    console.log("✅ Stall created with ID:", stallId);

    // Create raffle or auction record if needed
    let additionalInfo = {};
    
    if (priceType_final === "Raffle") {
      const [raffleResult] = await connection.execute(
        `INSERT INTO raffle (
          stall_id, raffle_status, created_by_manager, created_at
        ) VALUES (?, 'Waiting for Participants', ?, NOW())`,
        [stallId, branchManagerId]
      );
      
      additionalInfo.raffleId = raffleResult.insertId;
      console.log("✅ Raffle created with ID:", raffleResult.insertId);
      
    } else if (priceType_final === "Auction") {
      const [auctionResult] = await connection.execute(
        `INSERT INTO auction (
          stall_id, starting_price, auction_status, created_by_manager, created_at
        ) VALUES (?, ?, 'Waiting for Bidders', ?, NOW())`,
        [stallId, finalPrice, branchManagerId]
      );
      
      additionalInfo.auctionId = auctionResult.insertId;
      console.log("✅ Auction created with ID:", auctionResult.insertId);
    }

    let successMessage = `Stall ${stallNo_final} added successfully to ${floorName}, ${sectionName}`;
    
    if (priceType_final === "Raffle") {
      successMessage += `. Raffle will start when first applicant applies (Deadline: ${deadline_final})`;
    } else if (priceType_final === "Auction") {
      successMessage += `. Auction will start when first bid is placed (Deadline: ${deadline_final}, Starting: ₱${finalPrice})`;
    }

    res.status(201).json({
      success: true,
      message: successMessage,
      data: {
        id: stallId,
        ...stallData,
        floor_name: floorName,
        section_name: sectionName,
        branch_name: branchName,
        ...additionalInfo
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