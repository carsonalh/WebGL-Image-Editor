import { getGlImageSize } from './webgl';

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

export interface SceneState {
    cameraX: number;
    cameraY: number;
    cameraScale: number;
    mouseDown: boolean;
    imageWidth: number;
    imageHeight: number;
    glImageData: ArrayBuffer;
}

interface ImplementationState {
    glWidth: number;
    glHeight: number;
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
        glImageData: new Uint32Array(initialGlWidth * initialGlHeight).fill(
            0xffffffff
        ).buffer,
    },
    {
        glWidth: initialGlWidth,
        glHeight: initialGlHeight,
    }
);

const { setState, getState, mutateState, getAllState } = sceneState;

export { getState };

export const setCameraPosition = (x: number, y: number) => {
    setState({ cameraX: x, cameraY: y });
};

export const addCameraPosition = (dx: number, dy: number) => {
    mutateState(state => {
        state.cameraX += dx;
        state.cameraY += dy;
    });

    const state = getState();
    console.log(`Camera { x = ${state.cameraX}, y = ${state.cameraY} }`);
};

export const multiplyCameraScale = (factor: number) => {
    mutateState(state => (state.cameraScale *= factor));
};

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

export const getGlWidth = () => getAllState().glWidth;
export const getGlHeight = () => getAllState().glHeight;

export const setImagePixel = (x: number, y: number, color: number) => {
    mutateState(state => {
        const imageData32 = new Uint32Array(state.glImageData);
        const { glWidth } = state;
        imageData32[y * glWidth + x] = color;
    });
};

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

export const setMouseDown = (isMouseDown: boolean) => {
    setState({ mouseDown: isMouseDown });
};

export const getImageData = () => {
    const { imageWidth, imageHeight, glImageData } = getState();
    const { glWidth, glHeight } = getAllState();

    const imageData = new Uint32Array(imageWidth * imageHeight);
    const currentData = new Uint32Array(glImageData);

    for (let y = 0; y < imageHeight; y++) {
        const row = currentData.subarray(y * glWidth, y * glWidth + imageWidth);
        imageData.set(row, y * imageWidth);
    }

    return { imageWidth, imageHeight, imageData: imageData.buffer };
};
