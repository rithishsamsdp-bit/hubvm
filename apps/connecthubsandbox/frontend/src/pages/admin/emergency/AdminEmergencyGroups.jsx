import React from 'react';
import Icon from "../../../constants/Icon.jsx";
import { Button } from "../../../components/Index.jsx";

const AdminEmergencyGroups = ({ groups, handleViewContacts, handleDeleteGroup }) => (
    <div className="admin_emergency_groups_container">
        <div className="admin_emergency_groups_header">
            <div>
                <h3>Contact Groups</h3>
                <p>Manage your pre-defined recipient lists for instant deployment.</p>
            </div>
        </div>

        <div className="admin_emergency_groups_grid">
            {groups.length > 0 ? (
                groups.map(group => (
                    <div key={group.id} className="admin_emergency_group_card" onClick={() => handleViewContacts(group)}>
                        <div className="group_card_icon">
                            <Icon name="groups" size={24} color="#ff5200" />
                        </div>
                        <div className="group_card_info">
                            <h4>{group.name}</h4>
                            <span>{group.contactCount} Contacts</span>
                        </div>
                        <div className="group_card_actions">
                            <Button variant="empty" onClick={(e) => { e.stopPropagation(); handleViewContacts(group); }}><Icon name="eye" size={18} /></Button>
                            <Button variant="empty" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }}><Icon name="deletee" size={18} color="#ef4444" /></Button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="admin_emergency_empty_small">
                    <p>No groups found. Create one to simplify your alert process.</p>
                </div>
            )}
        </div>
    </div>
);

export default AdminEmergencyGroups;
