import { getGlImageSize } from './webgl';

/**
 * Creates a mutable state store
 *
 * @param initialState Initialised public state
 * @param implementationState Initialised private/implementation state
 * @returns Object containing functions to read/write the state
 */
const createState = <
    State extends Record<string, any>,
    Impl extends Record<string, any> = Record<string, any>
>(
    initialState: State,
    implementationState?: Impl
) => {
    const state = { ...initialState } as State & Impl;
    if (implementationState) {
        Object.assign(state, implementationState);
    }
    const setState = (stateUpdate: Partial<State>) => {
        Object.assign(state, stateUpdate);
    };
    const getState = (): State => state;
    const mutateState = (stateMutator: (mutableState: State & Impl) => void) =>
        stateMutator(state);
    const getAllState = (): State & Impl => state;
    return { setState, getState, getAllState, mutateState };
};

/**
 * Public application state for the WebGL scene.
 */
export interface SceneState {
    /** The x coordinate of the camera */
    cameraX: number;
    /** The y coordinate of the camera */
    cameraY: number;
    /** The scale of the camera (used for zoom operations) */
    cameraScale: number;
    /** Whether the right mouse button is down or not (for panning) */
    mouseDown: boolean;
    /** The width of the image, as seen by the user */
    imageWidth: number;
    /** The height of the image, as seen by the user */
    imageHeight: number;
}

/**
 * Private/implementation state for the WebGL scene.
 */
interface ImplementationState {
    /** The width of the image, as seen by WebGL */
    glWidth: number;
    /** The height of the image, as seen by WebGL */
    glHeight: number;
    /** The image data, as given to WebGL */
    glImageData: ArrayBuffer;
}

const INITIAL_WIDTH = 32;
const INITIAL_HEIGHT = 32;

const [initialGlWidth, initialGlHeight] = getGlImageSize(
    INITIAL_WIDTH,
    INITIAL_HEIGHT
);

const sceneState = createState<SceneState, ImplementationState>(
    {
        cameraX: 0,
        cameraY: 0,
        cameraScale: 32,
        mouseDown: false,
        imageWidth: INITIAL_WIDTH,
        imageHeight: INITIAL_HEIGHT,
    },
    {
        glWidth: initialGlWidth,
        glHeight: initialGlHeight,
        glImageData: new Uint32Array(initialGlWidth * initialGlHeight).fill(
            0xffffffff
        ).buffer,
    }
);

const { setState, getState, mutateState, getAllState } = sceneState;

export { getState, getAllState };

/**
 * Sets the position of the camera
 */
export const setCameraPosition = (x: number, y: number) => {
    setState({ cameraX: x, cameraY: y });
};

/**
 * Adds an xy delta to the camera's position
 */
export const addCameraPosition = (dx: number, dy: number) => {
    mutateState(state => {
        state.cameraX += dx;
        state.cameraY += dy;
    });

    const state = getState();
    console.log(`Camera { x = ${state.cameraX}, y = ${state.cameraY} }`);
};

/**
 * Multiplies the camera's scale by a given factor
 */
export const multiplyCameraScale = (factor: number) => {
    mutateState(state => (state.cameraScale *= factor));
};

/**
 * Sets the size of the image to a new width and height
 *
 * If width or height are smaller than what they were previously, the current
 * implementation is the now cut-off data is not deleted.
 */
export const setImageSize = (width: number, height: number) => {
    mutateState(state => {
        if (width > state.glWidth || height > state.glHeight) {
            const oldData = new Uint32Array(state.glImageData);
            const [newGlWidth, newGlHeight] = getGlImageSize(width, height);
            const newData = new Uint32Array(newGlWidth * newGlHeight).fill(
                0xffffffff
            );

            const oldGlWidth = state.glWidth;
            const oldGlHeight = state.glHeight;

            for (let y = 0; y < oldGlHeight; y++) {
                const row = oldData.subarray(
                    y * oldGlWidth,
                    (y + 1) * oldGlWidth
                );
                newData.set(row, y * newGlWidth);
            }

            state.glWidth = newGlWidth;
            state.glHeight = newGlHeight;
            state.glImageData = newData.buffer;
        }

        state.imageWidth = width;
        state.imageHeight = height;
    });
};

/**
 * Sets a single pixel of the image to a given RGBA color
 *
 * @param color A little-endian RGBA color
 */
export const setImagePixel = (x: number, y: number, color: number) => {
    mutateState(state => {
        const imageData32 = new Uint32Array(state.glImageData);
        const { glWidth } = state;
        imageData32[y * glWidth + x] = color;
    });
};

/**
 * Completely overwrites the old image with a new one
 */
export const setImage = (
    width: number,
    height: number,
    imageData: ArrayBuffer
) => {
    mutateState(state => {
        if (width > state.glWidth || height > state.glHeight) {
            const [newGlWidth, newGlHeight] = getGlImageSize(width, height);
            state.glWidth = newGlWidth;
            state.glHeight = newGlHeight;
            state.glImageData = new Uint32Array(
                newGlWidth * newGlHeight
            ).buffer;
        }
        const currentData = new Uint32Array(state.glImageData);
        currentData.fill(0xffffffff);
        const newData = new Uint32Array(imageData);
        for (let y = 0; y < height; y++) {
            const row = newData.subarray(y * width, (y + 1) * width);
            currentData.set(row, y * state.glWidth);
        }
    });

    setState({ imageWidth: width, imageHeight: height });
};

/**
 * Set whether the mouse is down or not (for panning).
 */
export const setMouseDown = (isMouseDown: boolean) => {
    setState({ mouseDown: isMouseDown });
};

/**
 * Gets the image data that the user would see, and nothing else
 *
 * Because WebGL requires that image textures be a certain size, this accessor
 * extracts only the relevant parts of the texture to produce an image with
 * width `state.imageWidth` and height `state.imageHeight`.
 */
export const getImageData = () => {
    const { imageWidth, imageHeight } = getState();
    const { glWidth, glHeight, glImageData } = getAllState();

    const imageData = new Uint32Array(imageWidth * imageHeight);
    const currentData = new Uint32Array(glImageData);

    for (let y = 0; y < imageHeight; y++) {
        const row = currentData.subarray(y * glWidth, y * glWidth + imageWidth);
        imageData.set(row, y * imageWidth);
    }

    return { imageWidth, imageHeight, imageData: imageData.buffer };
};
