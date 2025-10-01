// Test script to verify the addStall logic
const testData = {
  stallNumber: "NPM-001",
  price: 2500,
  location: "Test Location", 
  size: "3x3",
  floorId: 1,  // This is what frontend sends
  sectionId: 2, // This is what frontend sends
  description: "Test stall",
  isAvailable: true,
  priceType: "Fixed Price"
};

console.log("=== TESTING FIELD MAPPING ===");
console.log("Frontend data:", testData);

// Simulate the backend mapping logic
const {
  stallNumber,
  stallNo = stallNumber,
  price,
  rental_price = price,
  floor_id,
  floor = floor_id,
  floorId,  // Frontend sends this
  section_id,
  section = section_id,
  sectionId,  // Frontend sends this
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
} = testData;

const stallNo_final = stallNo || stallNumber;
const price_final = rental_price || price;
const location_final = stall_location || location;
const image_final = stall_image || image;
const priceType_final = price_type || priceType || "Fixed Price";
const floor_id_final = floor_id || floor || floorId;
const section_id_final = section_id || section || sectionId;

console.log("=== MAPPED VALUES ===");
console.log("stallNo_final:", stallNo_final);
console.log("price_final:", price_final);
console.log("location_final:", location_final);
console.log("floor_id_final:", floor_id_final);
console.log("section_id_final:", section_id_final);

// Check if all required fields are present
const requiredFieldsPresent = !!(stallNo_final && price_final && location_final && size && floor_id_final && section_id_final);
console.log("=== VALIDATION ===");
console.log("All required fields present:", requiredFieldsPresent);

if (!requiredFieldsPresent) {
  console.log("❌ Missing fields detected!");
} else {
  console.log("✅ All required fields present - should proceed to stall creation");
}