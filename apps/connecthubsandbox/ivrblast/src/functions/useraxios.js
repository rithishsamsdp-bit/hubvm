import axios from 'axios';

// You can set the domain dynamically based on the environment or some config
const getDomain = () => {
    // const testing_api = 'http://10.0.0.213:3001';
    
    const testing_api = 'https://connecthub-ivr.pulsework360.com';
    const production_api = 'https://connecthub-ivr.pulsework360.com:3001';


    const env = 'devlopment'; // "development", "production", etc.
    if (env === 'production') {
        return production_api; // Production domain 
    } else if (env === 'testing') {
        return testing_api; // Staging domain
    } else {
        return testing_api; // Development domain
    }
};

// Create the axios instance with the dynamic domain
const useraxios = axios.create({
    baseURL: getDomain(), // Set dynamic base URL
    withCredentials: true,
});

// You can set common headers if needed
useraxios.defaults.headers.common['Content-Type'] = 'application/json';

export default useraxios;
