import React from 'react';
import Icon from "../../../../constants/Icon.jsx";

const WhatsAppPreview = ({ data }) => {
    if (!data) return null;

    let content = data;
    if (typeof data === 'string' && (data.startsWith('{') || data.startsWith('['))) {
        try {
            content = JSON.parse(data);
        } catch (e) {
            return <div className="wa_preview_error">{data}</div>;
        }
    }

    if (typeof content !== 'object') return <div>{content}</div>;

    const components = content.components || [];
    const header = components.find(c => c.type === 'HEADER'); // Case might vary
    const body = components.find(c => c.type === 'BODY');
    const footer = components.find(c => c.type === 'FOOTER');
    const buttonGroup = components.find(c => c.type === 'BUTTONS');

    // Handle potential lowercase from some APIs
    const getComp = (type) => components.find(c => c.type?.toUpperCase() === type.toUpperCase());

    const hComp = getComp('HEADER');
    const bComp = getComp('BODY');
    const fComp = getComp('FOOTER');
    const btnsComp = getComp('BUTTONS');

    return (
        <div className="wa_chat_preview_root">
            <div className="wa_chat_bubble">
                {hComp && (
                    <div className="wa_chat_header">
                        {hComp.format === 'IMAGE' ? (
                            <div className="wa_header_media_placeholder">
                                <Icon name="image" size={24} color="#94a3b8" />
                            </div>
                        ) : hComp.text}
                    </div>
                )}
                <div className="wa_chat_body">
                    {bComp?.text || "No content"}
                    <span className="wa_chat_time">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <Icon name="success_icon" size={12} color="#53bdeb" />
                    </span>
                </div>
                {fComp && (
                    <div className="wa_chat_footer">
                        {fComp.text}
                    </div>
                )}
                {btnsComp?.buttons?.map((btn, idx) => (
                    <div key={idx} className="wa_chat_button">
                        {btn.type === 'url' && <Icon name="external_link" size={14} color="#007aff" />}
                        {btn.type === 'phone_number' && <Icon name="call" size={14} color="#007aff" />}
                        {btn.text}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WhatsAppPreview;
