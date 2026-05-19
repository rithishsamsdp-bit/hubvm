// services/chataxios.js — Axios instance for the chat REST API
import axios from 'axios';

const getDomain = () => import.meta.env.VITE_CHAT_API;

const chataxios = axios.create({
  baseURL: getDomain(),
  withCredentials: true,   // send the same accessToken cookie
});

export default chataxios;
