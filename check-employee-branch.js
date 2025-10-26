/**
 * Quick script to check employee branch assignment
 */

import { createConnection } from './Naga-Stall-Management/config/database.js';

async function checkEmployeeBranch() {
  let connection;
  try {
    connection = await createConnection();
    
    // Check employee jeno.laurente359
    const [employeeData] = await connection.execute(`
      SELECT 
        e.employee_id,
        e.employee_username,
        e.first_name,
        e.last_name,
        e.branch_id,
        b.branch_name,
        b.area,
        b.location
      FROM employee e
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      WHERE e.employee_username = ?
    `, ['jeno.laurente359']);

    console.log('🔍 Employee Data:', employeeData);

    // Check all branches
    const [branches] = await connection.execute(`
      SELECT branch_id, branch_name, area, location
      FROM branch
      ORDER BY branch_id
    `);

    console.log('🏢 All Branches:');
    branches.forEach(branch => {
      console.log(`  ID: ${branch.branch_id} | Name: ${branch.branch_name} | Area: ${branch.area} | Location: ${branch.location}`);
    });

    // Check if there are any applicants in branch 1
    const [applicantsInBranch1] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM application app
      INNER JOIN stall s ON app.stall_id = s.stall_id
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      WHERE b.branch_id = 1
    `);

    console.log('📊 Applicants in Branch 1:', applicantsInBranch1[0].count);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

checkEmployeeBranch();