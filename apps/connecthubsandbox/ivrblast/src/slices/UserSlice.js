import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: null,
}


export const UserSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
        },
        removeUser: (state, action) => {
            state.user = null;
        }
    }
})


export const { setUser, removeUser } = UserSlice.actions;

export default UserSlice.reducer;