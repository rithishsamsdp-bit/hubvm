import axios from 'axios';

// You can set the domain dynamically based on the environment or some config
const getDomain = () => {
    return import.meta.env.VITE_DASHBOARD_API;
};

// Create the axios instance with the dynamic domain
const dashboardaxios = axios.create({
    baseURL: getDomain(),
    withCredentials: true,
});

// You can set common headers if needed
// testingaxios.defaults.headers.common['Content-Type'] = 'application/json';

export default dashboardaxios;
