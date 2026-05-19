import React from 'react';
import "./style/Navbar.css";
import { Dropdown } from 'antd';
import authaxios from '../functions/authaxios';

//icons
import { GoDotFill } from "react-icons/go";
import { FaCircleUser } from "react-icons/fa6";
import { FaAngleDown } from "react-icons/fa6";
import { IoExitOutline } from "react-icons/io5";

import Pulse_logo from "../assets/Pulse_logo.svg";

import { useAuthStore } from '../store/useAuthStore.js';

const Navbar = () => {

    const { authUser, logout } = useAuthStore();
    const username = authUser?.a_userName || "Null";
    const status = "AVALIABLE";

    const handleLogout = () => {
        console.log("User logged out");
        logout();
    };

    const items = [
        {
            label: <p onClick={handleLogout} className='nav_logout'>Logout <IoExitOutline /></p>,
            key: '0',
        },
        // {
        //   type: 'divider',
        // }
    ];

    return (
        <nav>
            {/* <p className='nav_Pulse_heading'>pulse</p> */}
            <img src={Pulse_logo} alt='Logo' style={{ width: "100px" }} />
            <div className='nav_user_container'>
                <FaCircleUser className='nav_user_icon' />
                <Dropdown
                    menu={{
                        items,
                    }}
                    trigger={['click']}
                >
                    <div className='nav_dropdown_container'>
                        <div className='nav_user_text_container'>
                            <p className='nav_username'>{username}</p>
                            <div className='nav_status_container'><GoDotFill style={{ color: 'green' }} />
                                <p className='nav_status_text'>{status}</p>
                            </div>
                        </div>

                        <FaAngleDown className='nav_drop_down_arrow' />
                    </div>

                </Dropdown>


            </div>
        </nav>
    )
}

export default Navbar
