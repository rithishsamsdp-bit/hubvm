-- Code to add after line 302 in your Lua dialplan
-- Checks m_readyStatus from p_members table and handles call accordingly

local dial_text = node.data.agent

-- Get extension number (adjust based on your variable name)
local extension_no = "42028"  -- or get from dial_text or session variable

-- Method: Direct database query using ODBC
-- Ensure mod_odbc is loaded and configured in FreeSWITCH
local dbh = freeswitch.Dbh("odbc://freeswitch:your_dsn_name")

if dbh:connected() then
    -- Query: SELECT m_readyStatus FROM p_members WHERE m_memberExtensionNo = '42028'
    local query = string.format("SELECT m_readyStatus FROM p_members WHERE m_memberExtensionNo = '%s'", extension_no)
    local result = dbh:query(query)
    
    local ready_status = nil
    if result and result[1] then
        ready_status = result[1].m_readyStatus
        freeswitch.consoleLog("INFO", string.format("Found ready status for extension %s: %s\n", extension_no, ready_status))
    else
        freeswitch.consoleLog("WARNING", string.format("No member found with extension %s\n", extension_no))
    end
    
    dbh:release()
    
    -- Check status and handle call
    if ready_status == "READY" then
        freeswitch.consoleLog("INFO", string.format("Agent %s is READY - Landing call\n", extension_no))
        -- Continue with call - land the call (your existing dial logic continues here)
    else
        freeswitch.consoleLog("INFO", string.format("Agent %s is NOT READY (status: %s) - Disconnecting call\n", extension_no, ready_status or "NULL"))
        -- Disconnect the call
        session:hangup("NO_ANSWER")
        return
    end
else
    freeswitch.consoleLog("ERR", "Failed to connect to database - Disconnecting call\n")
    session:hangup("NO_ANSWER")
    return
end

