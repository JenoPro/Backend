// Test stall application submission after trigger fix
import fetch from 'node-fetch';

const testApplicationSubmission = async () => {
  const testData = {
    // Basic Information
    first_name: "Test",
    middle_name: "Fix",
    last_name: "User",
    suffix: "",
    address: "123 Test Street",
    birthdate: "1990-01-15",
    birthplace: "Test City",
    age: "34",
    gender: "Male",
    civil_status: "Single",
    nationality: "Filipino",
    contact_number: "09123456789",
    email: "testfix@test.com",
    
    // Business Information
    business_name: "Test Business",
    business_type: "Food",
    business_capital: "50000",
    business_inventory: "Basic food supplies",
    
    // Stall Information
    application_type: "New",
    stall_area: "Naga City",
    stall_location: "Peoples Mall",
    stall_section: "A1",
    stall_number: "101",
    
    // Additional Information
    business_permit: "Yes",
    barangay_clearance: "Yes",
    cedula: "Yes",
    valid_id: "Yes",
    application_letter: "Yes",
    financial_statement: "Yes",
    barangay_business_clearance: "Yes",
    lease_contract: "Yes",
    pictures: "Yes",
    
    // Spouse Information (if applicable)
    spouse_first_name: "",
    spouse_middle_name: "",
    spouse_last_name: "",
    spouse_address: "",
    spouse_birthdate: "",
    spouse_birthplace: "",
    spouse_age: "",
    spouse_gender: "",
    spouse_civil_status: "",
    spouse_nationality: "",
    spouse_contact_number: "",
    spouse_email: ""
  };

  try {
    console.log('🧪 Testing stall application submission...');
    console.log('📧 Using test email:', testData.email);
    
    const response = await fetch('http://localhost:3001/api/landing-applicants/stall-application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.text();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Application submitted successfully');
      console.log('📊 Response:', result);
    } else {
      console.log('❌ FAILED! Status:', response.status);
      console.log('📊 Error Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
};

testApplicationSubmission();