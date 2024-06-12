import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Tool = 'dot' | 'line';

const INITIAL_WIDTH = 32;
const INITIAL_HEIGHT = 32;

const sceneSlice = createSlice({
    name: 'scene',
    initialState: {
        cameraX: 0,
        cameraY: 0,
        cameraScale: 32,
        leftMouseDown: false,
        rightMouseDown: false,
        tool: 'dot' as Tool,
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
        setLeftMouseDown(state, action) {
            state.leftMouseDown = action.payload;
        },
        setRightMouseDown(state, action) {
            state.rightMouseDown = action.payload;
        },
        setTool(state, action) {
            if (!['dot', 'line'].includes(action.payload)) {
                throw new Error('tool action payload of invalid format, got ' + action.payload);
            }

            state.tool = action.payload;
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
        setImage(
            state,
            action: PayloadAction<{
                width: number;
                height: number;
                data: number[];
            }>
        ) {
            const { width, height, data } = action.payload;
            state.imageWidth = width;
            state.imageHeight = height;
            state.imageData = data;
        },
        setImageSize(
            state,
            action: PayloadAction<{ width: number; height: number }>
        ) {
            const { width, height } = action.payload;
            const oldHeight = state.imageHeight;
            const oldWidth = state.imageWidth;
            // Set the actual stored width and height
            state.imageWidth = width;
            state.imageHeight = height;

            // Pixel bytes are stored as RGBA, one byte for each channel sample
            const BYTES_PER_PIXEL = 4;

            // Now update all the image data
            const updatedImage = new Uint8Array(
                BYTES_PER_PIXEL * width * height
            ).fill(0xff);

            const { imageData } = state;
            const minWidth = Math.min(width, oldWidth);
            const minHeight = Math.min(height, oldHeight);

            for (let y = 0; y < minHeight; y++) {
                const px = y * oldWidth;
                const pxOffset = BYTES_PER_PIXEL * px;
                const row = imageData.slice(
                    pxOffset,
                    pxOffset + BYTES_PER_PIXEL * minWidth
                );
                updatedImage.set(row, BYTES_PER_PIXEL * (y * width));
            }

            state.imageData = Array.from(updatedImage);
        },
    },
});

export const {
    setCameraPosition,
    addCameraPosition,
    setCameraScale,
    multiplyCameraScale,
    setLeftMouseDown,
    setRightMouseDown,
    setTool,
    setImagePixel,
    setImageData,
    setImageSize,
    setImage,
} = sceneSlice.actions;

const lineToolSlice = createSlice({
    name: 'line tool',
    initialState: {
        pixelStartX: null as number | null,
        pixelStartY: null as number | null,
        width: null as number | null,
        height: null as number | null,
        displayMask: null as Array<number> | null,
    },
    reducers: {
        initialiseDisplayMask(state, action: PayloadAction<[[number, number], number[]]>) {
            const [[width, height], displayMask] = action.payload;

            if (displayMask.length !== width * height) {
                throw new Error('inconsistent size of display mask initialisation and image dimensions');
            }

            state.width = width;
            state.height = height;
            state.displayMask = displayMask;
        },
        setStartXY(state, action: PayloadAction<[number, number]>) {
            state.pixelStartX = action.payload[0];
            state.pixelStartY = action.payload[1];
        },
        setDisplayMask(state, action: PayloadAction<number[]>) {
            if (state.width == null || state.height == null || state.displayMask == null) {
                throw new Error('cannot perform update on uninitialised display mask');
            }

            if (action.payload.length !== state.width * state.height) {
                throw new Error('inconsistent displaymask update');
            }

            state.displayMask = action.payload;
        },
        uninitialiseLineTool(state, action) {
            state.width = null;
            state.height = null;
            state.displayMask = null;
        }
    },
});

export const {
    initialiseDisplayMask,
    setDisplayMask,
    setStartXY,
} = lineToolSlice.actions;

const store = configureStore({
    reducer: {
        scene: sceneSlice.reducer,
        lineTool: lineToolSlice.reducer,
    },
});

export default store;
