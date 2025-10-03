// FIXED: Frontend submitForm method for AddAvailableStall.js
async submitForm() {
  // Validate form first
  if (!this.$refs.form.validate()) {
    this.$emit('show-message', {
      type: 'error',
      text: 'Please fill in all required fields correctly.',
    })
    return
  }

  this.loading = true

  try {
    // FIXED: Use the correct field names and include floor_id for new schema
    const stallData = {
      stallNumber: this.newStall.stallNumber, // Backend expects 'stallNumber'
      price: parseFloat(this.newStall.price), // Backend expects 'price'
      location: this.newStall.location, // Backend expects 'location'
      size: this.newStall.size, // Send size directly
      floorId: this.newStall.floorId, // FIXED: Send floorId for new schema
      sectionId: this.newStall.sectionId, // FIXED: Send sectionId instead of section
      description: this.newStall.description,
      isAvailable: this.newStall.isAvailable,
      priceType: this.newStall.priceType,
    }

    // FIXED: Calculate deadline datetime for raffle/auction stalls
    if (this.requiresDuration) {
      // Calculate the actual deadline datetime
      const now = new Date()
      const deadlineDate = new Date(now)
      deadlineDate.setDate(deadlineDate.getDate() + parseInt(this.newStall.deadlineDays))
      
      // Set the time
      const [hours, minutes] = this.newStall.deadlineTime.split(':')
      deadlineDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      // Send as ISO string (what backend expects)
      stallData.deadline = deadlineDate.toISOString()
      stallData.applicationDeadline = deadlineDate.toISOString() // Alternative field name
      
      console.log('Calculated deadline:', {
        days: this.newStall.deadlineDays,
        time: this.newStall.deadlineTime,
        calculatedDeadline: deadlineDate.toISOString()
      })
    }

    // Convert image to base64 if uploaded
    if (this.newStall.image) {
      try {
        stallData.image = await this.convertImageToBase64(this.newStall.image)
      } catch (imageError) {
        console.error('Error converting image:', imageError)
        this.$emit('show-message', {
          type: 'warning',
          text: 'Image upload failed, but stall will be created without image.',
        })
      }
    }

    console.log('Sending stall data to backend:', stallData)

    // Get auth token from sessionStorage
    const token = sessionStorage.getItem('authToken')

    if (!token) {
      this.$emit('show-message', {
        type: 'error',
        text: 'Authentication token not found. Please login again.',
      })
      this.$router.push('/login')
      return
    }

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }

    console.log('Making API request to:', `${this.apiBaseUrl}/api/stalls`)

    // Make API call to backend
    const response = await fetch(`${this.apiBaseUrl}/api/stalls`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(stallData),
    })

    console.log('Response status:', response.status)

    const result = await response.json()
    console.log('Backend response:', result)

    if (!response.ok) {
      if (response.status === 401) {
        this.$emit('show-message', {
          type: 'error',
          text: 'Session expired. Please login again.',
        })
        this.$router.push('/login')
        return
      } else if (response.status === 400) {
        throw new Error(result.message || 'Bad request - check required fields')
      } else if (response.status === 403) {
        throw new Error('Access denied - branch manager authentication required')
      }
      throw new Error(result.message || `HTTP error! status: ${response.status}`)
    }

    if (result.success) {
      // Store the stall data for later use
      this.lastAddedStall = result.data || stallData

      // Show success popup animation
      this.showSuccessAnimation(result.message || 'Stall added successfully!')

      console.log('Stall added successfully - will show real-time update after popup')
    } else {
      throw new Error(result.message || 'Failed to add stall')
    }
  } catch (error) {
    console.error('Error adding stall:', error)
    this.handleSubmissionError(error)
  } finally {
    this.loading = false
  }
}