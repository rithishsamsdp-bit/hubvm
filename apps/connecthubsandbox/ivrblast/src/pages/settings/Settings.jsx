import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';  
import './style/Settings.css';
import Skilllist from './Skilllist';
import Businessholiday from './Businessholiday';
import Blocklist from './Blocklist';
import { Error } from '../common';
import Carrier from './Carrier.jsx';
import Campaign from './Campaign.jsx';
import Queue from './Queue.jsx';

const Settings = () => {
    const { item } = useParams();  
    const navigate = useNavigate(); 

    const handleItemClick = (newItem) => {
        navigate(`/settings/${newItem}`);  
    };

    return (
        <div className='Settings_container'>
            <div className='Settings_container_1'>
                <div className='Settings_heading_container'>
                    <p className='Settings_heading'>Settings</p>
                </div>
                <div className={`settings_text_container ${item === 'skill' ? 'textcontaineractive' : ''}`} onClick={() => handleItemClick('skill')}>
                    <p className={`settings_text ${item === 'skill' ? 'textactive' : ''}`}>Skill list</p>
                </div>
                <div className={`settings_text_container ${item === 'block' ? 'textcontaineractive' : ''}`} onClick={() => handleItemClick('block')}>
                    <p className={`settings_text ${item === 'block' ? 'textactive' : ''}`}>Block list</p>
                </div>
                <div className={`settings_text_container ${item === 'carrier' ? 'textcontaineractive' : ''}`} onClick={() => handleItemClick('carrier')}>
                    <p className={`settings_text ${item === 'carrier' ? 'textactive' : ''}`}>Carrier</p>
                </div>
                <div className={`settings_text_container ${item === 'campaign' ? 'textcontaineractive' : ''}`} onClick={() => handleItemClick('campaign')}>
                    <p className={`settings_text ${item === 'campaign' ? 'textactive' : ''}`}>Campaign</p>
                </div>
                <div className={`settings_text_container ${item === 'callflow' ? 'textcontaineractive' : ''}`} onClick={() => handleItemClick('callflow')}>
                    <p className={`settings_text ${item === 'callflow' ? 'textactive' : ''}`}>Call flow</p>
                </div>
                <div className={`settings_text_container ${item === 'business&holiday' ? 'textcontaineractive' : ''}`} onClick={() => handleItemClick('business&holiday')}>
                    <p className={`settings_text ${item === 'business&holiday' ? 'textactive' : ''}`}>Business Hours / Holiday</p>
                </div>
                <div className={`settings_text_container ${item === 'Queue' ? 'textcontaineractive' : ''}`} onClick={() => handleItemClick('Queue')}>
                    <p className={`settings_text ${item === 'Queue' ? 'textactive' : ''}`}>Queue</p>
                </div>
            </div>
            <div className='Settings_container_2'>
                {item === 'skill' && <Skilllist />}
                {item === 'block' && <Blocklist />}
                {item === 'carrier' && <Carrier/>}
                {item === 'campaign' && <Campaign/>}
                {item === 'callflow' && <div>Call flow content here</div>}
                {item === 'business&holiday' && <Businessholiday />}
                {item === 'Queue' && <Queue/>}
                {!['skill', 'block', 'carrier', 'campaign', 'callflow', 'business&holiday','Queue'].includes(item) && <Error />}

            </div>
        </div>
    );
}

export default Settings;
