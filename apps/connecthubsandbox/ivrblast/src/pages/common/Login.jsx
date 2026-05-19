import React, { useState } from 'react';
import './style/Login.css';
import { Button, Form, Input, Alert, Spin } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { HiOutlineOfficeBuilding } from "react-icons/hi";
import { useNavigate } from 'react-router-dom';
import Pulse_logo from "../../assets/Pulse_logo.svg";
import Background from "../../assets/Login-banner.png";
import { useAuthStore } from '../../store/useAuthStore';

const Login = () => {

  const { setAuthUser, setAuthRole, login, isLoggingIn } = useAuthStore();

  const navigate = useNavigate();

  const onFinish = async (data) => {
    login(data);
  };

  return (
    <div className="Login_conatiner">
      <img src={Pulse_logo} alt="logo" className="Login_Pulse_logo" />
      {isLoggingIn ? (
        <div className="loading-overlay">
          <Spin size="large" />
        </div>
      ) : (

        <div className="Login_form_container">
          <p className="Login_welcome_text">Welcome Back!</p>
          <p className="Login_small_text">Enter username and password to access your account.</p>
          <Form
            name="login"
            initialValues={{
              remember: true,
            }}
            className="Login_form"
            onFinish={onFinish}
          >
            <Form.Item
              name="companycode"
              rules={[
                {
                  required: true,
                  message: 'Please input your Company Code!',
                },
              ]}
            >
              <Input prefix={<HiOutlineOfficeBuilding />} placeholder="Company Code" />
            </Form.Item>
            <Form.Item
              name="username"
              rules={[
                {
                  required: true,
                  message: 'Please input your Username!',
                },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="Username" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Please input your Password!',
                },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} type="password" placeholder="Password" />
            </Form.Item>

            <Form.Item>
              <Button block type="primary" htmlType="submit" disabled={isLoggingIn}>
                Log in
              </Button>
            </Form.Item>
          </Form>

          <p className="Login_small_text_grey">
            If you encounter any issues during the login process or have any questions, please contact our Technical team.
          </p>
        </div>
      )}

      <div className="Login_img_container">
        <img src={Background} style={{ width: '90%' }} alt="login background" />
      </div>


    </div>
  );
};

export default Login;
