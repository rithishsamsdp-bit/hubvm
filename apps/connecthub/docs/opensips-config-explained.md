# OpenSIPS Configuration - ELI5 Guide 📞

This document explains the OpenSIPS configuration script in simple terms.

---

## 🌐 Global Parameters (Lines 1-50)

**What it does:** Sets up the basic settings for the phone system server.

| Setting | ELI5 Explanation |
|---------|------------------|
| `log_level=3` | How much detail to write in logs (like a diary for the server) |
| `udp_workers=4` | 4 helpers to handle phone calls at the same time |
| `alias` | The server's nickname (like your phone's caller ID name) |
| `advertised_address` | The public IP address phones use to find this server |
| `socket=udp/tls/wss` | Different "doors" phones can use to connect (regular, secure, web browser) |

---

## 📦 Modules Section (Lines 52-250)

**What it does:** Loads "apps" that give the server special abilities.

### Core Modules
| Module | ELI5 Explanation |
|--------|------------------|
| `signaling.so` | Lets the server send messages back to phones |
| `sl.so` | Handles simple replies like "OK" or "Error" |
| `tm.so` | Manages phone call conversations (remembers who said what) |
| `rr.so` | Leaves breadcrumbs so messages find their way back |
| `maxfwd.so` | Stops messages from bouncing forever (like a message timeout) |

### Database & Storage
| Module | ELI5 Explanation |
|--------|------------------|
| `db_mysql.so` | Connects to the database (the server's memory book) |
| `usrloc.so` | Remembers where each phone user is located |
| `registrar.so` | Signs users in/out (like a hotel check-in desk) |

### Security
| Module | ELI5 Explanation |
|--------|------------------|
| `auth.so` / `auth_db.so` | Checks passwords (like a bouncer at a club) |
| `tls_mgm.so` | Handles encrypted secure connections |
| `proto_tls.so` | Secure phone line protocol |
| `proto_wss.so` | Web browser secure connections |

### NAT & Media
| Module | ELI5 Explanation |
|--------|------------------|
| `nathelper.so` | Helps phones behind routers connect properly |
| `rtpengine.so` | Handles the actual voice/video streams |
| `dispatcher.so` | Load balancer - spreads calls across multiple servers |

### Extras
| Module | ELI5 Explanation |
|--------|------------------|
| `dialog.so` | Tracks active phone calls |
| `acc.so` | Accounting - logs call details for billing |
| `event_kafka.so` | Sends live updates to monitoring system |
| `tracer.so` | Records SIP messages for debugging (like call recording for engineers) |

---

## 📞 Main Routing Logic - `route{}` (Lines 252-500)

**What it does:** The "brain" that decides what to do with each incoming message.

### Flow Overview:
```
Incoming Message
      ↓
[Trace for debugging]
      ↓
[Check message type: REFER? NOTIFY? INVITE? REGISTER?]
      ↓
[Route to appropriate handler]
```

### Message Types Handled:

| Message | ELI5 Explanation |
|---------|------------------|
| `REFER` | "Hey, transfer this call to someone else" |
| `NOTIFY` | "FYI, something happened" (just say OK) |
| `INVITE` | "I want to start a phone call" |
| `REGISTER` | "I'm logging in, here's where to find me" |
| `BYE` | "I'm hanging up now" |
| `CANCEL` | "Never mind, forget that call I tried to make" |
| `ACK` | "Got it, thanks" |
| `OPTIONS` | "Are you alive?" (health check) |

---

## 📝 REGISTRAR Route (Lines 502-580)

**What it does:** Handles user login/logout to the phone system.

### Steps:
1. **Fix NAT** - Adjust contact info for users behind routers
2. **Detect NAT** - Check if user needs special handling
3. **Authenticate** - Verify username and password
4. **Check Expiry** - Registration must last at least 60 seconds
5. **Save Location** - Remember where this user's phone is
6. **Notify Kafka** - Tell monitoring system user is online/offline

---

## 🔀 Relay Route (Lines 582-900)

**What it does:** The main call routing logic - decides where calls go.

### Call Types:

#### 1. Conference Calls (`X-Conference-In` header)
- Routes to FreeSWITCH conference server
- Adds room ID for multi-party calls

#### 2. Barge-In Calls (`X-Barge-In` header)
- Supervisor joining an existing call
- Routes to specific FreeSWITCH IP

#### 3. Inbound Calls (from external carriers)
- Calls coming from PSTN/trunk providers
- IPs: `43.254.110.198`, `180.179.7.98`, etc.
- Routes to FreeSWITCH as `pulseInbound`

#### 4. Internal Extension Calls (5-8 digit numbers)
- Employee-to-employee calls
- Looks up destination in location database
- Routes through FreeSWITCH as `pulseInternal`

#### 5. Outbound Calls (everything else)
- Calls going to external numbers
- Requires authentication
- Routes to FreeSWITCH as `pulseOutbound`

### RTPEngine Usage:
```
WebRTC Users:   ICE=force DTLS=pass (encrypted, browser-friendly)
UDP Users:      replace-origin (simple, direct)
```

---

## 📥 Reply Routes (Lines 902-1400)

**What it does:** Handles responses from FreeSWITCH and other servers.

### Response Codes:
| Code | Meaning | What Script Does |
|------|---------|------------------|
| `180` | Ringing | Update status to "RINGING" in Kafka |
| `183` | Progress | Set up early media (ringback tone) |
| `200` | OK/Answered | Update status to "INCALL", process SDP |
| `4xx` | Client Error | Update status to "AVAILABLE" |
| `5xx` | Server Error | Update status to "AVAILABLE" |
| `487` | Cancelled | Mark as cancelled |
| `503` | Unavailable | Mark as busy |

### Reply Route Types:
| Route | Use Case |
|-------|----------|
| `handle_outbound` | Replies for outgoing calls |
| `handle_inbound` | Replies for incoming calls to agents |
| `handle_inbound_core` | Replies for calls from trunk |
| `handle_inbound_reinvite` | Replies for mid-call changes |
| `handle_update_reply` | Replies for UPDATE messages |

---

## ❌ Failure Route (Lines 1402-1420)

**What it does:** Handles failed calls.

- **503 Error**: Server unavailable → Try next server
- **603 Error**: Call declined → Tell caller "Temporarily Unavailable"
- **Cancelled**: User hung up before answer → Log and exit

---

## 📊 CDR Events (Lines 1422-1500)

**What it does:** Creates Call Detail Records for billing and analytics.

### Data Captured:
- Call duration and bill seconds
- Source and destination numbers
- Disposition (Answered/Missed/Cancelled)
- Cost calculation based on rate table

### Events:
| Event | When Triggered |
|-------|----------------|
| `E_ACC_CDR` | Call completed normally |
| `E_ACC_MISSED_EVENT` | Call was missed/unanswered |

---

## 🔌 User Location Events (Lines 1510-1540)

**What it does:** Tracks when users log out.

- `E_UL_CONTACT_DELETE`: User logged out or registration expired
- Publishes "UNAVAILABLE" status to Kafka

---

## 🔧 Utility Routes

### `kafka_report` (Line 1545)
Reports Kafka message delivery status.

### `dump_all_vars` (Lines 1550-1560)
Debug route - prints ALL SIP variables to log for troubleshooting.

---

## 🗺️ Call Flow Diagram

```
                    ┌─────────────────┐
                    │  Phone/WebRTC   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    OpenSIPS     │
                    │  (This Config)  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼────────┐   ┌───────▼───────┐
│  FreeSWITCH   │   │   RTPEngine     │   │    MySQL      │
│ (Call Logic)  │   │ (Media Relay)   │   │  (User Data)  │
└───────────────┘   └─────────────────┘   └───────────────┘
        │
┌───────▼───────┐
│  PSTN/Trunk   │
│  (Real Phones)│
└───────────────┘
```

---

## 🎯 Key IP Addresses in Config

| IP | Purpose |
|----|---------|
| `13.201.218.156` | Public IP of OpenSIPS |
| `10.0.4.114` | Private IP of OpenSIPS |
| `3.108.94.72` | RTPEngine media server |
| `10.0.4.19/10.0.4.201` | FreeSWITCH servers |
| `13.126.75.6:30092` | Kafka broker |
| `10.0.4.171:9060` | Homer SIP capture |

---

## 📚 Glossary

| Term | Simple Meaning |
|------|----------------|
| **SIP** | Protocol phones use to talk to each other |
| **RTP** | The actual voice/video data stream |
| **NAT** | Router that hides your real IP address |
| **WebRTC** | Phone calls in web browsers |
| **FreeSWITCH** | Server that handles call features |
| **Kafka** | Message queue for real-time updates |
| **CDR** | Call Detail Record (phone bill data) |
| **Dialog** | An active phone call conversation |
| **Transaction** | A single SIP request-response exchange |
