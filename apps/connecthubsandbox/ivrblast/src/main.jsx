import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx';
import { ConfigProvider, message } from 'antd';

const customTheme = {
  token: {
    colorPrimary: '#009586',
    colorLink: '#009586',
  },
};

createRoot(document.getElementById('root')).render(
  <ConfigProvider theme={customTheme}>
    <App />
  </ConfigProvider>

)
