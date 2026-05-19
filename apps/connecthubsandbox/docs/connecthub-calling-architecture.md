# ConnectHub Calling Setup

## Domestic Calling Infrastructure

### OpenSIPS Server (Proxy)

| Property | Value |
|----------|-------|
| **Domain** | `pulse-proxy-1.pulsework360.com` |
| **IP** | `13.201.218.156` |

### FreeSWITCH Servers (Media)

| Server | IP |
|--------|-----|
| FS-1 | `3.108.200.16` |
| FS-2 | `3.111.143.128` |

### RTPEngine Server

| Server | IP |
|--------|-----|
| RTPEngine | `3.108.94.72` |

---

### Dialplan & Directory

#### Outbound and Inbound Calls

- **Dialplan Module**: `mod_xml_curl`
  - **URL**: `https://connecthub.pulsework360.com/callroutingdomestic/voice2`
  - **Pod Name**: `callroutingdomestic`

- **Directory Module**: `mod_xml_curl`
  - **URL**: `https://connecthub.pulsework360.com/callroutingdomestic/directory`
  - **Pod Name**: `callroutingdomestic`
  - > **Note**: This is only for voicemail handling

- **Inbound Lua Script**: `/opt/freeswitch/storage/script/ivrFlowv3.lua`

---

### Voicemail

Voicemail is triggered via Lua script:

```lua
local vm_box = node.data.voicemailBox or "default@default"
session:execute("voicemail", "default " .. vm_box)
```

---

### Queue (Call Center)

- **Module**: FreeSWITCH built-in `callcenter` module
- **Realtime Stats**: Enabled

**Database Tables Used:**
- `members`
- `agents`
- `tiers`

---

### Conference

- **Module**: FreeSWITCH built-in conference module

---

### Peers (SIP Profiles)

- **Profile Type**: External profile for trunks
- **Path**: `/opt/freeswitch/storage/proxy1/external`

---

### Recording

- **Module**: FreeSWITCH built-in recording module
- **Storage Path**: `/var/www/html/recordings`

---

### Post-Call Logging

| Call Type | Script Path |
|-----------|-------------|
| Outbound | `/opt/freeswitch/storage/script/outbound_out_post_data.lua` |
| Inbound | `/opt/freeswitch/storage/script/inbound_in_post_data.lua` |

---

### After Answer Scripts

| Call Type | Script Path |
|-----------|-------------|
| Outbound | `/opt/freeswitch/storage/script/outbound_answer.lua` |
| Inbound | `/opt/freeswitch/storage/script/inbound_answer.lua` |

---

### Call Limit Handling

- **Module**: FreeSWITCH built-in limit module with **hiredis** (Redis)

```python
ET.SubElement(condition, "action", attrib={
    "application": "limit",
    "data": f"hiredis default accountId Limit"
})
```

---

---

## International Calling Infrastructure

### OpenSIPS Server (Proxy)

| Property | Value |
|----------|-------|
| **Domain** | `pulse-proxy-2.pulsework360.com` |
| **IP** | `15.206.40.47` |

### FreeSWITCH Servers (Media)

| Server | IP |
|--------|-----|
| FS-1 | `13.202.160.214` |
| FS-2 | `3.111.21.220` |

### RTPEngine Server

| Server | IP |
|--------|-----|
| RTPEngine | `3.108.94.72` |

---

### Dialplan & Directory

#### Outbound and Inbound Calls

- **Dialplan Module**: `mod_xml_curl`
  - **URL**: `https://connecthub.pulsework360.com/callrouting/voice2`
  - **Pod Name**: `callrouting`

- **Directory Module**: `mod_xml_curl`
  - **URL**: `https://connecthub.pulsework360.com/callrouting/directory`
  - **Pod Name**: `callrouting`
  - > **Note**: This is only for voicemail handling

- **Inbound Lua Script**: `/opt/freeswitch/storage/script/ivrFlowv3.lua`

---

### Voicemail

Voicemail is triggered via Lua script:

```lua
local vm_box = node.data.voicemailBox or "default@default"
session:execute("voicemail", "default " .. vm_box)
```

---

### Queue (Call Center)

- **Module**: FreeSWITCH built-in `callcenter` module
- **Realtime Stats**: Enabled

**Database Tables Used:**
- `members`
- `agents`
- `tiers`

---

### Conference

- **Module**: FreeSWITCH built-in conference module

---

### Peers (SIP Profiles)

- **Profile Type**: External profile for trunks
- **Path**: `/opt/freeswitch/storage/proxy1/external`

---

### Recording

- **Module**: FreeSWITCH built-in recording module
- **Storage Path**: `/var/www/html/recordings`

---

### Post-Call Logging

| Call Type | Script Path |
|-----------|-------------|
| Outbound | `/opt/freeswitch/storage/script/outbound_out_post_data.lua` |
| Inbound | `/opt/freeswitch/storage/script/inbound_in_post_data.lua` |

---

### After Answer Scripts

| Call Type | Script Path |
|-----------|-------------|
| Outbound | `/opt/freeswitch/storage/script/outbound_answer.lua` |
| Inbound | `/opt/freeswitch/storage/script/inbound_answer.lua` |

---

### Call Limit Handling

- **Module**: FreeSWITCH built-in limit module with **hiredis** (Redis)

```python
ET.SubElement(condition, "action", attrib={
    "application": "limit",
    "data": f"hiredis default accountId Limit"
})
```
