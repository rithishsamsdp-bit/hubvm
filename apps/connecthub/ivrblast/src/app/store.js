import { configureStore } from "@reduxjs/toolkit";
import TokenReducer from "../slices/TokenSlice";
import UserReducer from "../slices/UserSlice";


const store = configureStore({
    reducer:{
        tokenInfo:TokenReducer,
        userInfo:UserReducer,
    }
})


export default store;