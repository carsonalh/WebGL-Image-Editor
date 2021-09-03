import { configureStore, createSlice } from '@reduxjs/toolkit';

const sceneSlice = createSlice({
    name: 'scene',
    initialState: {
        cameraX: 0,
        cameraY: 0,
        cameraScale: 1,
        imageWidth: 32,
        imageHeight: 32,
        imageData: new Uint32Array(32 * 32),
    },
    reducers: {
        setCameraPosition(state, action) {
            const { x, y } = action.payload;
            state.cameraX = x;
            state.cameraY = y;
        },
        addCameraPosition(state, action) {
            const { x, y } = action.payload;
            state.cameraX += x;
            state.cameraY += y;
        },
        setCameraScale(state, action) {
            state.cameraScale = action.payload;
        },
        multiplyCameraScale(state, action) {
            state.cameraScale *= action.payload;
        },
        // setImageBuffer(state, action) {
        //     state.imageData = action.payload;
        // },
        // setImageSize(state, action) {
        //     const { width, height } = action.payload;
        //     state.imageWidth = width;
        //     state.imageHeight = height;
        // },
        setImagePixel(state, action) {
            const {x, y} = action.payload.xy;
            const width = state.imageWidth;
            state.imageData[y * width + x] = action.payload.color;
        }
    }
});

export const {
    setCameraPosition,
    addCameraPosition,
    setCameraScale,
    multiplyCameraScale,
    setImagePixel
} = sceneSlice.actions;

const store = configureStore({
    reducer: {
        scene: sceneSlice.reducer
    }
});

export default store;
