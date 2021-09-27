import { configureStore, createSlice } from '@reduxjs/toolkit';

const INITIAL_WIDTH = 32;
const INITIAL_HEIGHT = 32;

const sceneSlice = createSlice({
    name: 'scene',
    initialState: {
        cameraX: 0,
        cameraY: 0,
        cameraScale: 1,
        mouseDown: false,
        imageWidth: INITIAL_WIDTH,
        imageHeight: INITIAL_HEIGHT,
        imageData: new Array<number>(4 * INITIAL_WIDTH * INITIAL_HEIGHT).fill(
            0xff
        ),
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
        setMouseDown(state, action) {
            state.mouseDown = action.payload;
        },
        setImagePixel(state, action) {
            const { x, y } = action.payload.xy;
            const width = state.imageWidth;
            const pxIndex = y * width + x;
            const { color } = action.payload;

            state.imageData[4 * pxIndex + 0] = (color & 0x000000ff) >> (0 * 8);
            state.imageData[4 * pxIndex + 1] = (color & 0x0000ff00) >> (1 * 8);
            state.imageData[4 * pxIndex + 2] = (color & 0x00ff0000) >> (2 * 8);
            state.imageData[4 * pxIndex + 3] = (color & 0xff000000) >> (3 * 8);
        },
        setImageData(state, action) {
            state.imageData = action.payload;
        },
    },
});

export const {
    setCameraPosition,
    addCameraPosition,
    setCameraScale,
    multiplyCameraScale,
    setMouseDown,
    setImagePixel,
    setImageData,
} = sceneSlice.actions;

const store = configureStore({
    reducer: {
        scene: sceneSlice.reducer,
    },
});

export default store;
