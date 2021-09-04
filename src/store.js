import { configureStore, createSlice } from '@reduxjs/toolkit';

const sceneSlice = createSlice({
    name: 'scene',
    initialState: {
        cameraX: 0,
        cameraY: 0,
        cameraScale: 1,
        imageWidth: 32,
        imageHeight: 32,
        imageData: new Array(4 * 32 * 32).fill(0xFF),
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
        setImagePixel(state, action) {
            const { x, y } = action.payload.xy;
            const width = state.imageWidth;
            const pxIndex = y * width + x;
            const { color } = action.payload;

            state.imageData[4 * pxIndex + 0] = (color & 0x000000FF) >> (0 * 8);
            state.imageData[4 * pxIndex + 1] = (color & 0x0000FF00) >> (1 * 8);
            state.imageData[4 * pxIndex + 2] = (color & 0x00FF0000) >> (2 * 8);
            state.imageData[4 * pxIndex + 3] = (color & 0xFF000000) >> (3 * 8);
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
