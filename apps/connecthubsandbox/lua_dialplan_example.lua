-- Example Lua code for FreeSWITCH dialplan
-- This code should be added around line 302 in your Untitled-1 file

local dial_text = node.data.agent

-- Extension number to check (you can also get this from dial_text or session variable)
local extension_no = "42028"

-- Method 1: Using ODBC (if mod_odbc is configured in FreeSWITCH)
-- Make sure you have ODBC configured in /usr/local/freeswitch/conf/autoload_configs/odbc.conf.xml
local dbh = freeswitch.Dbh("odbc://freeswitch:dsn_name")

if dbh:connected() then
    -- Query database for ready status
    local sql_query = "SELECT m_readyStatus FROM p_members WHERE m_memberExtensionNo = " .. extension_no
    local result = dbh:query(sql_query)
    
    local ready_status = nil
    if result and result[1] then
        ready_status = result[1].m_readyStatus
    end
    
    dbh:release()
    
    -- Check if status is READY
    if ready_status == "READY" then
        freeswitch.consoleLog("INFO", "Agent " .. extension_no .. " is READY - Landing call\n")
        -- Continue with call - land the call
        -- Your existing dial logic here
    else
        freeswitch.consoleLog("INFO", "Agent " .. extension_no .. " is NOT READY (status: " .. (ready_status or "NULL") .. ") - Disconnecting call\n")
        -- Disconnect the call
        session:hangup("NO_ANSWER")
        return
    end
else
    -- Method 2: Using HTTP API call (alternative if ODBC is not available)
    -- Call your Python API endpoint to check ready status
    local api_url = "http://your-api-host:port/api/check-member-status?extension=" .. extension_no
    local response = freeswitch.API("curl", api_url)
    
    if response then
        -- Parse JSON response (you may need to use a JSON library)
        -- For simplicity, assuming API returns "READY" or "NOTREADY"
        local ready_status = response:match('"status":"([^"]+)"') or response:match("READY") and "READY" or "NOTREADY"
        
        if ready_status == "READY" then
            freeswitch.consoleLog("INFO", "Agent " .. extension_no .. " is READY - Landing call\n")
            -- Continue with call
        else
            freeswitch.consoleLog("INFO", "Agent " .. extension_no .. " is NOT READY - Disconnecting call\n")
            session:hangup("NO_ANSWER")
            return
        end
    else
        freeswitch.consoleLog("ERR", "Failed to check agent status - Disconnecting call\n")
        session:hangup("NO_ANSWER")
        return
    end
end

