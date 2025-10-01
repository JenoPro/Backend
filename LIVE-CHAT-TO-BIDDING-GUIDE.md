# 🎯 DYNAMIC LIVE CHAT TO BIDDING SYSTEM

## Backend Implementation Complete! ✅

Your backend now supports dynamic interface switching between **Live Chat** (for raffles) and **Bidding System** (for auctions) when the "Go Live" button is clicked.

## 🆕 New API Endpoints

### 1. Get Live Stall Information
```
GET /api/stalls/:stallId/live-info
```
**Purpose:** Determines whether to show chat interface or bidding interface

**Response Example:**
```json
{
  "success": true,
  "data": {
    "stall_id": 123,
    "stall_no": "NPM-001",
    "price_type": "Auction",
    "interface_type": "auction_bidding", // "raffle_chat" | "auction_bidding" | "fixed_price"
    "show_chat": false,
    "show_bidding": true,
    "go_live_enabled": true,
    "live_status": "Not Started",
    "live_system_data": {
      "auction_id": 456,
      "starting_price": 2500,
      "current_highest_bid": null,
      "minimum_next_bid": 2550,
      "recent_bids": [],
      "time_remaining": "WAITING"
    }
  }
}
```

### 2. Start Live Session (Go Live)
```
POST /api/stalls/:stallId/go-live
```
**Purpose:** Activates the live system and tells frontend which interface to show

**Response Example:**
```json
{
  "success": true,
  "message": "Auction for stall NPM-001 is now live! Bidding system is active.",
  "data": {
    "stall_id": 123,
    "price_type": "Auction",
    "live_status": "Live",
    "live_system": {
      "type": "auction",
      "interface": "bidding",
      "features": ["place_bids", "bid_history", "timer_display", "highest_bid_tracker"]
    },
    "frontend_action": {
      "switch_interface": true,
      "new_interface": "bidding",
      "enable_features": ["place_bids", "bid_history", "timer_display"]
    }
  }
}
```

## 🖥️ Frontend Implementation Guide

### Step 1: Check Stall Type Before Showing Interface
```javascript
// When user views a stall, check what interface to show
const checkLiveInterface = async (stallId) => {
  try {
    const response = await fetch(`/api/stalls/${stallId}/live-info`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Dynamically show appropriate interface
      if (data.data.show_chat) {
        showLiveChatInterface(data.data);
      } else if (data.data.show_bidding) {
        showBiddingInterface(data.data);
      } else {
        showFixedPriceInterface(data.data);
      }
    }
  } catch (error) {
    console.error('Error checking live interface:', error);
  }
};
```

### Step 2: Handle "Go Live" Button Click
```javascript
// When branch manager clicks "Go Live"
const handleGoLive = async (stallId) => {
  try {
    const response = await fetch(`/api/stalls/${stallId}/go-live`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.data.frontend_action.switch_interface) {
      // Transform interface based on response
      if (data.data.frontend_action.new_interface === 'bidding') {
        // Replace Live Chat with Bidding System
        transformToBiddingSystem(data.data);
      } else if (data.data.frontend_action.new_interface === 'chat') {
        // Keep Live Chat for raffle
        activateRaffleChatSystem(data.data);
      }
    }
  } catch (error) {
    console.error('Error starting live session:', error);
  }
};
```

### Step 3: Dynamic Interface Components
```html
<!-- Vue.js Example -->
<template>
  <div class="live-system-container">
    <!-- Go Live Button (for branch managers) -->
    <button 
      v-if="!stallData.live_status || stallData.live_status === 'Not Started'"
      @click="handleGoLive"
      class="go-live-btn"
    >
      🔴 Go Live
    </button>
    
    <!-- Dynamic Interface -->
    <div v-if="stallData.live_status === 'Live'">
      <!-- Live Chat for Raffles -->
      <div v-if="stallData.interface_type === 'raffle_chat'" class="live-chat-system">
        <h3>🎯 Raffle Live Chat</h3>
        <div class="chat-messages">
          <div v-for="participant in stallData.live_system_data.participants" :key="participant.participant_id">
            💬 {{ participant.applicant_full_name }} joined the raffle
          </div>
        </div>
        <div class="raffle-info">
          <p>👥 Participants: {{ stallData.live_system_data.total_participants }}</p>
          <p>⏰ Time Remaining: {{ stallData.live_system_data.time_remaining }}</p>
        </div>
      </div>
      
      <!-- Bidding System for Auctions -->
      <div v-if="stallData.interface_type === 'auction_bidding'" class="bidding-system">
        <h3>🏺 Auction Bidding System</h3>
        <div class="current-bid">
          <h4>Current Highest Bid: ₱{{ stallData.live_system_data.current_highest_bid || stallData.live_system_data.starting_price }}</h4>
        </div>
        <div class="bid-input">
          <input 
            v-model="newBidAmount" 
            type="number" 
            :min="stallData.live_system_data.minimum_next_bid"
            placeholder="Enter your bid"
          />
          <button @click="placeBid">Place Bid</button>
        </div>
        <div class="bid-history">
          <h5>Recent Bids:</h5>
          <div v-for="bid in stallData.live_system_data.recent_bids" :key="bid.bid_id">
            💰 {{ bid.bidder_name }}: ₱{{ bid.bid_amount }}
          </div>
        </div>
        <div class="auction-info">
          <p>⏰ Time Remaining: {{ stallData.live_system_data.time_remaining }}</p>
          <p>📊 Total Bids: {{ stallData.live_system_data.total_bids }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      stallData: {},
      newBidAmount: null
    };
  },
  methods: {
    async handleGoLive() {
      // Call the API and transform interface
      const response = await this.$http.post(`/api/stalls/${this.stallData.stall_id}/go-live`);
      if (response.data.success) {
        // Update interface based on response
        this.stallData = { ...this.stallData, ...response.data.data };
      }
    },
    
    async placeBid() {
      // Place bid using existing auction endpoint
      const response = await this.$http.post(`/api/stalls/${this.stallData.stall_id}/bid`, {
        bidAmount: this.newBidAmount
      });
      
      if (response.data.success) {
        // Refresh live info
        this.refreshLiveInfo();
      }
    },
    
    async refreshLiveInfo() {
      const response = await this.$http.get(`/api/stalls/${this.stallData.stall_id}/live-info`);
      if (response.data.success) {
        this.stallData = response.data.data;
      }
    }
  }
};
</script>
```

## 🎯 How It Works

1. **Initial Load**: Frontend calls `/api/stalls/:stallId/live-info` to determine interface type
2. **Raffle Stalls**: Shows `interface_type: "raffle_chat"` → Live Chat System
3. **Auction Stalls**: Shows `interface_type: "auction_bidding"` → Bidding System  
4. **Go Live Click**: Branch manager clicks "Go Live" → Backend responds with interface switch instruction
5. **Dynamic Transform**: Frontend switches from chat to bidding (or activates chat) based on `frontend_action.new_interface`

## 🚀 Backend Features

✅ **Auto-Detection**: Automatically detects stall type and returns appropriate interface  
✅ **Dynamic Switching**: "Go Live" button triggers interface transformation  
✅ **Live Data**: Real-time participant count for raffles, bid amounts for auctions  
✅ **Time Management**: Timer countdown for both systems  
✅ **Permission Control**: Only stall creators can go live  
✅ **Frontend Guidance**: Clear instructions on what interface to show

Your backend is ready! The Live Chat will automatically transform into a Bidding System when you click "Go Live" on auction stalls. 🎉