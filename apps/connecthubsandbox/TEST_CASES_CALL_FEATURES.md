# Call Features Test Cases

## Test Environment Setup
- **API Endpoint**: `http://your-domain/callrouting/voice2`
- **Test Database**: `onedb`
- **Campaign ID**: `1`
- **FreeSWITCH Server**: `10.0.4.19`

---

## Test Case 1: Outbound Call
**Test ID**: TC_OUT_001  
**Feature**: Outbound Call  
**Priority**: High  
**Test Type**: Functional

### Prerequisites
- Agent registered with extension
- Valid CLI number configured
- Gateway configured and active

### Test Data
```json
{
  "variable_sip_h_X-campaignId": "1",
  "variable_sip_h_X-Auth_user": "agent001",
  "Caller-Username": "agent001",
  "Caller-Caller-ID-Name": "Agent One",
  "Caller-Caller-ID-Number": "1001",
  "variable_sip_to_user": "919876543210",
  "FreeSWITCH-IPv4": "10.0.4.19",
  "variable_sip_h_X-uniqueId": "unique-123456",
  "variable_sip_req_user": "pulseOutbound",
  "variable_sip_user_agent": "SIP.js/0.21.1",
  "variable_uuid": "uuid-outbound-001"
}
```

### Test Steps
1. Send POST request to `/callrouting/voice2` with test data
2. Verify XML response is generated
3. Check bridge string contains correct gateway
4. Verify caller ID is set correctly
5. Monitor call establishment

### Expected Results
- Status Code: 200
- XML contains `<extension name="outbound_campaign_1">`
- Bridge string: `sofia/gateway/{gateway_name}/{prefix}{number}`
- Caller ID set to configured CLI number
- Call successfully connects

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Case 2: Inbound Call
**Test ID**: TC_IN_001  
**Feature**: Inbound Call  
**Priority**: High  
**Test Type**: Functional

### Prerequisites
- DID number mapped to campaign
- IVR flow configured
- Call center queue created

### Test Data
```json
{
  "variable_sip_h_X-campaignId": "1",
  "Caller-Username": "+919876543210",
  "Caller-Caller-ID-Name": "Customer",
  "Caller-Caller-ID-Number": "+919876543210",
  "variable_sip_to_user": "914446824217",
  "FreeSWITCH-IPv4": "10.0.4.19",
  "variable_sip_h_X-uniqueId": "unique-inbound-001",
  "variable_sip_req_user": "pulseInbound",
  "variable_sip_user_agent": "Asterisk PBX 18.14.0",
  "variable_uuid": "uuid-inbound-001"
}
```

### Test Steps
1. Send POST request with inbound call data
2. Verify XML response contains IVR flow
3. Check call routing to queue
4. Verify agent receives call notification
5. Test answer and call connection

### Expected Results
- Status Code: 200
- XML contains `<extension name="inbound_campaign_1">`
- IVR script executed: `lua ivrFlowv3.lua`
- Call queued successfully
- Recording starts automatically

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Case 3: Mute/Unmute
**Test ID**: TC_MUTE_001  
**Feature**: Mute/Unmute during active call  
**Priority**: Medium  
**Test Type**: Functional

### Prerequisites
- Active call in progress (outbound or inbound)
- WebRTC/Softphone client connected

### Test Steps
1. Establish an active call (use TC_OUT_001 or TC_IN_001)
2. Click "Mute" button on agent interface
3. Verify audio is muted (agent can hear customer, customer cannot hear agent)
4. Click "Unmute" button
5. Verify audio is restored (both parties can hear each other)

### Expected Results
**Mute:**
- Mute icon appears on UI
- RTP stream from agent stops/silence packets sent
- Customer hears silence
- Agent can still hear customer

**Unmute:**
- Mute icon disappears
- RTP stream resumes
- Customer can hear agent again

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Case 4: Hold/Unhold
**Test ID**: TC_HOLD_001  
**Feature**: Hold/Unhold during active call  
**Priority**: Medium  
**Test Type**: Functional

### Prerequisites
- Active call in progress
- Hold music configured on FreeSWITCH

### Test Steps
1. Establish an active call
2. Click "Hold" button on agent interface
3. Verify customer hears hold music
4. Wait for 10 seconds
5. Click "Unhold" button
6. Verify call is resumed

### Expected Results
**Hold:**
- Hold status appears on UI
- Customer hears music on hold (MOH)
- Agent line is silent
- Call timer continues

**Unhold:**
- Hold status clears
- Music stops
- Two-way audio restored
- No audio quality degradation

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Case 5: Internal Cold Transfer
**Test ID**: TC_INT_XFER_001  
**Feature**: Internal Cold Transfer (< 8 digits)  
**Priority**: High  
**Test Type**: Functional

### Prerequisites
- Active call between agent and customer
- Target agent (internal) is available
- Proxy IP configured: `10.0.4.114` or `10.0.4.180`

### Test Data
```json
{
  "variable_sip_h_X-campaignId": "1",
  "Caller-Callee-ID-Number": "1001",
  "Caller-Destination-Number": "1002",
  "variable_sip_to_user": "919876543210",
  "FreeSWITCH-IPv4": "10.0.4.19",
  "variable_sip_h_X-uniqueId": "unique-xfer-001",
  "variable_sip_refer_to": "sip:1002@pulse-proxy-1.pulsework360.com",
  "variable_uuid": "uuid-transfer-001",
  "variable_sip_h_X-Target-uuid": "target-uuid-001",
  "variable_sip_network_ip": "10.0.4.114"
}
```

### Test Steps
1. Agent A (1001) is on call with customer
2. Agent A initiates transfer to Agent B (1002) - internal extension
3. Send transfer request to `/callrouting/voice2`
4. Verify transfer XML is generated
5. Customer is connected to Agent B
6. Verify Agent A is disconnected

### Expected Results
- Status Code: 200
- Destination length < 8 detected
- Bridge string: `sofia/external/sip:${1}@{proxyIP}:5182`
- ProxyIP extracted from refer_to domain
- Regex pattern: `^(\\d{6,12})$`
- Caller ID shows: "Call transfer from {agent_name}"
- Customer successfully connected to Agent B
- Original call leg terminated

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Case 6: External Cold Transfer
**Test ID**: TC_EXT_XFER_001  
**Feature**: External Cold Transfer (≥ 8 digits)  
**Priority**: High  
**Test Type**: Functional

### Prerequisites
- Active call between agent and customer
- Gateway configured for external transfer
- Valid external phone number

### Test Data
```json
{
  "variable_sip_h_X-campaignId": "1",
  "Caller-Callee-ID-Number": "1001",
  "Caller-Destination-Number": "919999888877",
  "variable_sip_to_user": "919876543210",
  "FreeSWITCH-IPv4": "10.0.4.19",
  "variable_sip_h_X-uniqueId": "unique-ext-xfer-001",
  "variable_sip_refer_to": "sip:919999888877@pulse-proxy-1.pulsework360.com",
  "variable_uuid": "uuid-ext-transfer-001",
  "variable_sip_h_X-Target-uuid": "target-uuid-002",
  "variable_sip_network_ip": "10.0.4.114"
}
```

### Test Steps
1. Agent is on call with customer
2. Agent initiates transfer to external number (919999888877)
3. Send transfer request to `/callrouting/voice2`
4. Verify transfer XML is generated
5. External number is called
6. Customer is connected to external number
7. Verify agent is disconnected

### Expected Results
- Status Code: 200
- Destination length ≥ 8 detected
- Bridge string: `sofia/gateway/{gateway_name}/{prefix}${1}`
- Regex pattern: `^(\\d{6,12})$`
- Caller ID shows configured CLI number
- External number rings
- Customer successfully connected
- Original call terminated

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Case 7: Domain to IP Mapping
**Test ID**: TC_DOMAIN_MAP_001  
**Feature**: Domain to IP mapping for transfer  
**Priority**: Medium  
**Test Type**: Functional

### Test Data - Different Domains
```
Domain 1: pulse-proxy-1.pulsework360.com → 10.0.4.114
Domain 2: pulse-proxy-2.pulsework360.com → 10.0.4.180
Domain 3: unknown-domain.com → Use original proxyIP
```

### Test Steps
1. Send transfer request with `refer_to`: `<sip:1001@pulse-proxy-1.pulsework360.com>`
2. Verify logs show extracted domain
3. Verify IP mapped to `10.0.4.114`
4. Send transfer request with `refer_to`: `<sip:1002@pulse-proxy-2.pulsework360.com>`
5. Verify IP mapped to `10.0.4.180`
6. Send transfer request with unknown domain
7. Verify fallback to original proxyIP

### Expected Results
- Domain extraction regex works: `@([^>]+)`
- Known domains map correctly
- Unknown domains use fallback
- No crashes or errors
- Proper logging for debugging

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Case 8: Call Recording
**Test ID**: TC_REC_001  
**Feature**: Automatic call recording  
**Priority**: High  
**Test Type**: Functional

### Prerequisites
- Recording directory configured
- Sufficient disk space

### Test Steps
1. Make outbound/inbound call
2. Verify recording starts automatically
3. Complete the call
4. Check recording file exists
5. Verify recording playback

### Expected Results
- Recording starts on answer
- File format: `{uniqueId}.mp3`
- Recording path: `${recordings_dir}/{uniqueId}.mp3`
- Stereo recording enabled
- File accessible and playable

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Case 9: Error Handling - No Data Found
**Test ID**: TC_ERR_001  
**Feature**: Error handling when no transfer data  
**Priority**: Medium  
**Test Type**: Negative

### Test Data
```json
{
  "variable_sip_h_X-campaignId": "999",
  "Caller-Callee-ID-Number": "invalid_ext",
  "Caller-Destination-Number": "1001"
}
```

### Test Steps
1. Send transfer request with invalid/non-existent extension
2. Check XML response

### Expected Results
- Status Code: 200 (with error XML)
- XML contains: `<extension name="transfer_no_data">`
- Log message: "No data found for member"
- Hangup cause: `NO_ROUTE_DESTINATION`

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Case 10: Error Handling - Database Error
**Test ID**: TC_ERR_002  
**Feature**: Error handling for database failures  
**Priority**: Medium  
**Test Type**: Negative

### Test Steps
1. Simulate database connection failure
2. Send transfer request
3. Check error response

### Expected Results
- Status Code: 200 (with error XML)
- XML contains: `<extension name="transfer_db_error">`
- Error logged with details
- Hangup cause: `NORMAL_TEMPORARY_FAILURE`

### Actual Results
_To be filled during testing_

### Status
- [ ] Pass
- [ ] Fail
- [ ] Blocked

---

## Test Execution Summary

| Test ID | Feature | Status | Executed By | Date | Notes |
|---------|---------|--------|-------------|------|-------|
| TC_OUT_001 | Outbound Call | | | | |
| TC_IN_001 | Inbound Call | | | | |
| TC_MUTE_001 | Mute/Unmute | | | | |
| TC_HOLD_001 | Hold/Unhold | | | | |
| TC_INT_XFER_001 | Internal Transfer | | | | |
| TC_EXT_XFER_001 | External Transfer | | | | |
| TC_DOMAIN_MAP_001 | Domain Mapping | | | | |
| TC_REC_001 | Call Recording | | | | |
| TC_ERR_001 | Error - No Data | | | | |
| TC_ERR_002 | Error - DB Failure | | | | |

---

## Bug Report Template

**Bug ID**: BUG-XXX  
**Test Case ID**: TC_XXX  
**Severity**: Critical / High / Medium / Low  
**Priority**: P1 / P2 / P3  

**Summary**:  
Brief description of the issue

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**:  
What should happen

**Actual Result**:  
What actually happened

**Environment**:
- FreeSWITCH Version:
- API Version:
- Browser/Softphone:
- OS:

**Logs**:
```
Paste relevant logs here
```

**Screenshots**:
Attach screenshots if applicable

**Status**: Open / In Progress / Fixed / Closed

---

## Test Coverage Metrics

- **Total Test Cases**: 10
- **Passed**: _
- **Failed**: _
- **Blocked**: _
- **Not Executed**: _
- **Pass Rate**: _%

---

## Notes
- All timestamps should be logged
- Network latency should be monitored
- Audio quality should be verified
- Call disconnection reasons should be captured
- All tests should be repeatable

