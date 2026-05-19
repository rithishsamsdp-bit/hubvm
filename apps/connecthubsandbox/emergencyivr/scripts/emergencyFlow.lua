-- emergencyFlow.lua
local status, json = pcall(require, "cjson")
local log = function(level, msg) freeswitch.consoleLog("notice", msg .. "\n") end

function find_node_by_id(nodes, node_id)
    if not nodes or not node_id then return nil end
    for _, node in ipairs(nodes) do if node.id == node_id then return node end end
    return nil
end

function play_reminder(session, node)
    local msg = node.data.reminderMessage
    local path = node.data.reminderPath
    
    -- 1. Check if we have a pre-generated WAV path from the backend
    if path and path ~= "" and string.sub(path, 1, 1) == "/" then
        log("INFO", "[EmergencyFlow] Playing pre-generated reminder: " .. path)
        session:streamFile(path)
        return
    end

    -- 2. Fallback: Check if the message itself is a path or needs TTS
    if msg and msg ~= "" then
        if string.sub(msg, 1, 1) == "/" then
            log("INFO", "[EmergencyFlow] Playing reminder file: " .. msg)
            session:streamFile(msg)
        else
            log("INFO", "[EmergencyFlow] Attempting TTS (fails if mod_flite missing): " .. msg)
            session:execute("speak", "flite|kal|" .. msg)
        end
    end
end

function execute_keypad_node(session, node)
    log("INFO", "[EmergencyFlow] Executing Keypad: " .. (node.data.label or "IVR"))
    local max_attempts, timeout = 3, 5000
    local prompt = node.data.path
    
    session:execute("start_dtmf")
    
    for attempt = 1, max_attempts do
        if not session:ready() then return nil end
        session:execute("flush_dtmf")
        log("NOTICE", string.format("[EmergencyFlow] Attempt %d: Waiting for DTMF...", attempt))
        
        local digits = session:read(1, 1, prompt, timeout, "#")
        prompt = "" 
        
        if digits and digits ~= "" then
            log("NOTICE", "[EmergencyFlow] Captured: [" .. digits .. "]")
            session:execute("export", "emergency_ivr_digit=" .. digits)
            
            local matched = false
            if node.data and node.data.buttons then
                for _, btn in ipairs(node.data.buttons) do
                    if tostring(btn.key) == digits then
                        log("INFO", "[EmergencyFlow] Match found! Transitioning to: " .. btn.nodeId)
                        return btn.nodeId
                    end
                end
            end
            
            if not matched then
                log("NOTICE", "[EmergencyFlow] Invalid digit: " .. digits)
                session:execute("export", "emergency_ivr_status=invalid_input")
                play_reminder(session, node)
            end
        else
            log("NOTICE", "[EmergencyFlow] Captured: []")
            log("NOTICE", "[EmergencyFlow] Timeout on attempt " .. attempt)
            session:execute("export", "emergency_ivr_status=timeout")
            play_reminder(session, node)
        end
    end
    log("NOTICE", "[EmergencyFlow] Max attempts reached without valid input.")
    return "end" 
end

function execute_node(session, node)
    if not node then return nil end
    if node.type == "keypad" then return execute_keypad_node(session, node)
    elseif node.type == "audioMsg" then
        if node.data.path and node.data.path ~= "" then session:streamFile(node.data.path) end
        return "continue"
    elseif node.type == "callStart" then return "continue"
    elseif node.type == "callEnd" then return nil end
    return "continue"
end

function route_call(session)
    session:answer()
    local cf_id = session:getVariable("cf_callflowId")
    local dbh = freeswitch.Dbh("odbc://freeswitchCDR:admin:#Pulse#$2024")
    local cData = nil
    if cf_id and cf_id ~= "" then
        dbh:query("SELECT c_callflowData FROM p_callflows WHERE c_callflowId = '" .. cf_id .. "'", function(row)
            cData = row["c_callflowData"]
        end)
    end
    dbh:release()
    if not cData then
        log("ERROR", "[EmergencyFlow] No CallFlow data found for ID: " .. (cf_id or "nil"))
        session:hangup()
        return 
    end
    local config = json.decode(cData)
    local current_node_id, iteration = "start", 0
    while current_node_id and iteration < 20 do
        iteration = iteration + 1
        local node = find_node_by_id(config.nodes, current_node_id)
        local res = execute_node(session, node)
        if not session:ready() or res == nil then break end
        if res == "continue" then
            local next_id = nil
            for _, edge in ipairs(config.edges) do
                if edge.source == current_node_id then next_id = edge.target break end
            end
            current_node_id = next_id
        else
            current_node_id = res
        end
    end
    log("INFO", "[EmergencyFlow] Flow completed.")
    session:hangup()
end

if session then route_call(session) end
