import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    token: JSON.parse(sessionStorage.getItem('token')) || null,
}


export const TokenSlice = createSlice({
    name: "token",
    initialState,
    reducers: {
        setToken: (state, action) => {
            state.token = action.payload;
        },
        removeToken: (state, action) => {
            state.token = null;
        }
    }
})


export const { setToken, removeToken } = TokenSlice.actions;

export default TokenSlice.reducer;