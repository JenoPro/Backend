#!/usr/bin/env node

/**
 * Endpoint Testing Script
 * Tests all major API endpoints after database structure changes
 */

import axios from 'axios'

const API_BASE = 'http://localhost:3001'
let authToken = null

// Helper function to make requests
async function makeRequest(method, url, data = null, useAuth = false) {
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...(useAuth && authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      }
    }
    
    if (data) {
      config.data = data
    }

    const response = await axios(config)
    return {
      success: true,
      status: response.status,
      data: response.data
    }
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message
    }
  }
}

// Test functions
async function testBranchManagerLogin() {
  console.log('\n🔐 Testing Branch Manager Login...')
  
  const result = await makeRequest('POST', '/api/admin/login', {
    username: 'NCPM_Manager',
    password: 'password123'
  })
  
  if (result.success) {
    authToken = result.data.data.token
    console.log('✅ Login successful')
    console.log(`   User: ${result.data.data.user.fullName}`)
    console.log(`   Area: ${result.data.data.user.area}`)
    console.log(`   Location: ${result.data.data.user.location}`)
    console.log(`   Token: ${authToken ? 'Generated' : 'Missing'}`)
  } else {
    console.log('❌ Login failed:', result.error)
  }
  
  return result.success
}

async function testBranchManagerInfo() {
  console.log('\n👤 Testing Get Branch Manager Info...')
  
  const result = await makeRequest('GET', '/api/admin/info', null, true)
  
  if (result.success) {
    console.log('✅ Branch Manager Info retrieved')
    console.log(`   Manager: ${result.data.branchManager.fullName}`)
    console.log(`   Branch: ${result.data.branchManager.branchName || 'N/A'}`)
    console.log(`   Designation: ${result.data.branchManager.designation}`)
  } else {
    console.log('❌ Failed to get branch manager info:', result.error)
  }
  
  return result.success
}

async function testAvailableAreas() {
  console.log('\n🌍 Testing Get Available Areas (Landing Page)...')
  
  const result = await makeRequest('GET', '/api/stalls/areas')
  
  if (result.success) {
    const areas = result.data.data || result.data.areas
    console.log('✅ Areas retrieved')
    console.log(`   Count: ${areas?.length || 0}`)
    console.log(`   Areas: ${areas?.map(a => a.area || a).join(', ')}`)
  } else {
    console.log('❌ Failed to get areas:', result.error)
  }
  
  return result.success
}

async function testLocationsByArea() {
  console.log('\n📍 Testing Get Locations by Area (Landing Page)...')
  
  const result = await makeRequest('GET', '/api/stalls/locations?area=Naga%20City')
  
  if (result.success) {
    const locations = result.data.data || result.data.locations
    console.log('✅ Locations retrieved for Naga City')
    console.log(`   Count: ${locations?.length || 0}`)
    console.log(`   Locations: ${locations?.map(l => l.location || l).join(', ')}`)
  } else {
    console.log('❌ Failed to get locations:', result.error)
  }
  
  return result.success
}

async function testGetStalls() {
  console.log('\n🏪 Testing Get Stalls (Management)...')
  
  const result = await makeRequest('GET', '/api/stalls', null, true)
  
  if (result.success) {
    const stalls = result.data.data || result.data.stalls
    console.log('✅ Stalls retrieved')
    console.log(`   Count: ${stalls?.length || 0}`)
    if (stalls?.length > 0) {
      console.log(`   Sample: ${stalls[0].stall_no} - ${stalls[0].stall_location}`)
      console.log(`   Area: ${stalls[0].area || 'N/A'}`)
      console.log(`   Floor: ${stalls[0].floor_name || 'N/A'}`)
    }
  } else {
    console.log('❌ Failed to get stalls:', result.error)
  }
  
  return result.success
}

async function testGetFloors() {
  console.log('\n🏢 Testing Get Floors (Management)...')
  
  const result = await makeRequest('GET', '/api/floors', null, true)
  
  if (result.success) {
    const floors = result.data.data || result.data.floors
    console.log('✅ Floors retrieved')
    console.log(`   Count: ${floors?.length || 0}`)
    if (floors?.length > 0) {
      console.log(`   Sample: ${floors[0].floor_name}`)
    }
  } else {
    console.log('❌ Failed to get floors:', result.error)
  }
  
  return result.success
}

async function testGetSections() {
  console.log('\n🏬 Testing Get Sections (Management)...')
  
  const result = await makeRequest('GET', '/api/sections', null, true)
  
  if (result.success) {
    const sections = result.data.data || result.data.sections
    console.log('✅ Sections retrieved')
    console.log(`   Count: ${sections?.length || 0}`)
    if (sections?.length > 0) {
      console.log(`   Sample: ${sections[0].section_name} (${sections[0].section_code})`)
    }
  } else {
    console.log('❌ Failed to get sections:', result.error)
  }
  
  return result.success
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting API Endpoint Tests...')
  console.log('=' .repeat(50))
  
  const tests = [
    { name: 'Branch Manager Login', fn: testBranchManagerLogin, critical: true },
    { name: 'Branch Manager Info', fn: testBranchManagerInfo, critical: true },
    { name: 'Available Areas', fn: testAvailableAreas, critical: false },
    { name: 'Locations by Area', fn: testLocationsByArea, critical: false },
    { name: 'Get Stalls', fn: testGetStalls, critical: true },
    { name: 'Get Floors', fn: testGetFloors, critical: false },
    { name: 'Get Sections', fn: testGetSections, critical: false }
  ]
  
  const results = []
  
  for (const test of tests) {
    const success = await test.fn()
    results.push({ ...test, success })
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50))
  console.log('📊 Test Results Summary:')
  console.log('=' .repeat(50))
  
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const criticalFailed = results.filter(r => !r.success && r.critical).length
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    const critical = result.critical ? ' (CRITICAL)' : ''
    console.log(`${status} ${result.name}${critical}`)
  })
  
  console.log(`\n📈 Overall: ${passed}/${results.length} tests passed`)
  
  if (criticalFailed > 0) {
    console.log(`⚠️  ${criticalFailed} critical tests failed - system not ready`)
  } else if (failed > 0) {
    console.log(`⚠️  ${failed} non-critical tests failed - some features may not work`)
  } else {
    console.log('🎉 All tests passed - system is ready!')
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runTests().catch(console.error)
}

export { runTests }