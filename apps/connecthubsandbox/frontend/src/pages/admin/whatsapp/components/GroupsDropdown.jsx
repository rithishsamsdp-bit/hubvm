import React, { useState, useEffect } from "react";
import { Select } from "../../../../components/Index.jsx";
import whatsappaxios from "../../../../services/whatsappaxios";

const GroupsDropdown = ({ value, onChange }) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchGroups = async () => {
            setLoading(true);
            try {
                const res = await whatsappaxios.get("/whatsapp/group/list?limit=100");
                if (res.data && res.data.groups) {
                    const options = res.data.groups.map(g => ({
                        label: `${g.groupName} (${g.totalContacts})`,
                        value: g._id
                    }));
                    setGroups(options);
                }
            } catch (err) {
                console.error("Failed to fetch groups", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, []);

    return (
        <Select
            options={groups}
            value={value}
            onChange={(val) => onChange(val)}
            placeholder={loading ? "Loading groups..." : "Select a group"}
            disabled={loading}
            width="100%"
        />
    );
};

export default GroupsDropdown;
