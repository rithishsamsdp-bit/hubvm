# Call Features Test Case Document

## Test Case Information
**Project:** Call Management System Testing  
**Test Date:** [DD/MM/YYYY]  
**Tester:** [Name]  
**Environment:** [Dev/QA/Staging/Production]

---

## TC-001: Outbound Call - Basic Functionality

**Test Objective:** Verify outbound call can be initiated and connected successfully

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | - User logged into system<br>- Active phone line available<br>- Valid recipient number |
| **Test Data** | Recipient: [Phone Number] |

**Test Steps:**

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 1 | Click on "Make Call" button | Dialer interface opens | | ☐ Pass ☐ Fail |
| 2 | Enter valid phone number | Number displays in dialer | | ☐ Pass ☐ Fail |
| 3 | Click "Call" button | Call initiates, shows "Calling..." status | | ☐ Pass ☐ Fail |
| 4 | Wait for recipient to answer | Call connects, timer starts, call status shows "Connected" | | ☐ Pass ☐ Fail |
| 5 | Verify audio quality | Clear two-way audio communication | | ☐ Pass ☐ Fail |
| 6 | End the call | Call disconnects, call duration recorded | | ☐ Pass ☐ Fail |

**Notes:** _______________________________________________

---

## TC-002: Inbound Call - Basic Functionality

**Test Objective:** Verify inbound call can be received and answered successfully

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | - User logged into system<br>- System ready to receive calls |
| **Test Data** | Caller: [Phone Number] |

**Test Steps:**

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 1 | Initiate call from external number | System receives incoming call notification | | ☐ Pass ☐ Fail |
| 2 | Verify caller ID display | Caller number/name displays correctly | | ☐ Pass ☐ Fail |
| 3 | Verify ringtone | Ringtone plays, visual alert shown | | ☐ Pass ☐ Fail |
| 4 | Click "Answer" button | Call connects immediately | | ☐ Pass ☐ Fail |
| 5 | Verify audio quality | Clear two-way audio communication | | ☐ Pass ☐ Fail |
| 6 | End the call | Call disconnects properly, duration recorded | | ☐ Pass ☐ Fail |

**Notes:** _______________________________________________

---

## TC-003: Mute/Unmute During Active Call

**Test Objective:** Verify mute and unmute functionality works correctly during an active call

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | - Active call in progress (outbound or inbound) |
| **Test Data** | Active call with: [Phone Number] |

**Test Steps:**

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 1 | During active call, click "Mute" button | Mute button changes state, mute icon displayed | | ☐ Pass ☐ Fail |
| 2 | Speak into microphone | Other party cannot hear audio | | ☐ Pass ☐ Fail |
| 3 | Verify other party's audio | Can still hear other party speaking | | ☐ Pass ☐ Fail |
| 4 | Click "Unmute" button | Mute button returns to normal state | | ☐ Pass ☐ Fail |
| 5 | Speak into microphone | Other party can hear audio clearly | | ☐ Pass ☐ Fail |
| 6 | Repeat mute/unmute 3 times | Each toggle works consistently | | ☐ Pass ☐ Fail |

**Notes:** _______________________________________________

---

## TC-004: Hold/Unhold During Active Call

**Test Objective:** Verify hold and unhold functionality works correctly during an active call

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | - Active call in progress (outbound or inbound) |
| **Test Data** | Active call with: [Phone Number] |

**Test Steps:**

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 1 | During active call, click "Hold" button | Call status changes to "On Hold" | | ☐ Pass ☐ Fail |
| 2 | Verify hold music/message | Other party hears hold music or message | | ☐ Pass ☐ Fail |
| 3 | Verify no audio exchange | Neither party can hear each other | | ☐ Pass ☐ Fail |
| 4 | Wait 10 seconds | Call remains on hold, no disconnection | | ☐ Pass ☐ Fail |
| 5 | Click "Unhold" or "Resume" button | Call status returns to "Active" | | ☐ Pass ☐ Fail |
| 6 | Verify audio restoration | Two-way audio communication restored | | ☐ Pass ☐ Fail |
| 7 | Repeat hold/unhold 2 times | Each toggle works consistently | | ☐ Pass ☐ Fail |

**Notes:** _______________________________________________

---

## TC-005: Internal Cold Transfer

**Test Objective:** Verify call can be transferred to internal extension without consultation

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | - Active call in progress<br>- Valid internal extension available<br>- Transfer recipient is available |
| **Test Data** | Original Caller: [Phone Number]<br>Transfer To: [Internal Extension] |

**Test Steps:**

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 1 | During active call, click "Transfer" button | Transfer options display | | ☐ Pass ☐ Fail |
| 2 | Select "Cold Transfer" or "Blind Transfer" | Transfer interface opens | | ☐ Pass ☐ Fail |
| 3 | Enter internal extension number | Extension number displays | | ☐ Pass ☐ Fail |
| 4 | Click "Transfer" to complete | Original call disconnects from agent | | ☐ Pass ☐ Fail |
| 5 | Verify transfer recipient receives call | Extension rings, shows transfer source | | ☐ Pass ☐ Fail |
| 6 | Transfer recipient answers | Call connects successfully | | ☐ Pass ☐ Fail |
| 7 | Verify caller experience | Caller hears ringing/music, then connects to new party | | ☐ Pass ☐ Fail |
| 8 | Verify call history | Transfer logged with correct details | | ☐ Pass ☐ Fail |

**Notes:** _______________________________________________

---

## TC-006: External Cold Transfer

**Test Objective:** Verify call can be transferred to external number without consultation

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | - Active call in progress<br>- External transfer permissions enabled |
| **Test Data** | Original Caller: [Phone Number]<br>Transfer To: [External Phone Number] |

**Test Steps:**

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 1 | During active call, click "Transfer" button | Transfer options display | | ☐ Pass ☐ Fail |
| 2 | Select "Cold Transfer" or "Blind Transfer" | Transfer interface opens | | ☐ Pass ☐ Fail |
| 3 | Enter external phone number | Number displays correctly | | ☐ Pass ☐ Fail |
| 4 | Click "Transfer" to complete | Original call disconnects from agent | | ☐ Pass ☐ Fail |
| 5 | Verify external number receives call | External number rings with caller ID | | ☐ Pass ☐ Fail |
| 6 | External party answers | Call connects successfully | | ☐ Pass ☐ Fail |
| 7 | Verify caller experience | Caller hears ringing, then connects to external party | | ☐ Pass ☐ Fail |
| 8 | Verify call history/billing | Transfer logged, external call charges applied | | ☐ Pass ☐ Fail |

**Notes:** _______________________________________________

---

## TC-007: Combined Features Test - Outbound with Mute and Hold

**Test Objective:** Verify multiple features work correctly in combination during outbound call

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | - User logged into system<br>- Valid recipient number |
| **Test Data** | Recipient: [Phone Number] |

**Test Steps:**

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 1 | Make outbound call | Call connects successfully | | ☐ Pass ☐ Fail |
| 2 | Activate mute | Mute works, other party cannot hear | | ☐ Pass ☐ Fail |
| 3 | Deactivate mute | Audio restored | | ☐ Pass ☐ Fail |
| 4 | Put call on hold | Hold activates, hold music plays | | ☐ Pass ☐ Fail |
| 5 | Resume call from hold | Call becomes active again | | ☐ Pass ☐ Fail |
| 6 | Use mute again | Mute still functions properly | | ☐ Pass ☐ Fail |
| 7 | End call | Call disconnects cleanly | | ☐ Pass ☐ Fail |

**Notes:** _______________________________________________

---

## TC-008: Combined Features Test - Inbound with Transfer

**Test Objective:** Verify inbound call can be transferred after using hold feature

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | - User logged into system<br>- Internal extension available |
| **Test Data** | Caller: [Phone Number]<br>Transfer To: [Internal Extension] |

**Test Steps:**

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 1 | Receive and answer inbound call | Call connects successfully | | ☐ Pass ☐ Fail |
| 2 | Put call on hold | Hold activates properly | | ☐ Pass ☐ Fail |
| 3 | Resume call | Call becomes active | | ☐ Pass ☐ Fail |
| 4 | Initiate cold transfer to internal extension | Transfer completes successfully | | ☐ Pass ☐ Fail |
| 5 | Verify transfer recipient receives call | Extension rings and can answer | | ☐ Pass ☐ Fail |

**Notes:** _______________________________________________

---

## Test Summary Report

| Test Case ID | Test Case Name | Status | Priority | Comments |
|--------------|----------------|--------|----------|----------|
| TC-001 | Outbound Call | ☐ Pass ☐ Fail | High | |
| TC-002 | Inbound Call | ☐ Pass ☐ Fail | High | |
| TC-003 | Mute/Unmute | ☐ Pass ☐ Fail | High | |
| TC-004 | Hold/Unhold | ☐ Pass ☐ Fail | High | |
| TC-005 | Internal Cold Transfer | ☐ Pass ☐ Fail | High | |
| TC-006 | External Cold Transfer | ☐ Pass ☐ Fail | High | |
| TC-007 | Combined - Outbound | ☐ Pass ☐ Fail | Medium | |
| TC-008 | Combined - Inbound | ☐ Pass ☐ Fail | Medium | |

**Overall Test Result:** ☐ Pass ☐ Fail  
**Total Test Cases:** 8  
**Passed:** ___  
**Failed:** ___  
**Pass Rate:** ___%

---

## Issues/Defects Log

| Defect ID | Test Case | Description | Severity | Status |
|-----------|-----------|-------------|----------|--------|
| | | | | |
| | | | | |

---

**Tester Signature:** _________________ **Date:** _________  
**Reviewer Signature:** _________________ **Date:** _________

