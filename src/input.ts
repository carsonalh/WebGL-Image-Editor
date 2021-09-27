import store, { addCameraPosition, setImagePixel, setMouseDown } from './store';
import { screenToWorld, screenToWorldUnits } from './camera';
import { multiplyCameraScale } from './store';
import { Program } from './webgl';

function setupInput(canvas: HTMLCanvasElement, program: Program) {
    // We want to disable the context menu when right clicking on the canvas.
    // This should do the trick (thanks SO).
    canvas.oncontextmenu = e => {
        e.preventDefault();
        e.stopPropagation();
    };

    canvas.onmousedown = e => {
        e.preventDefault();

        const SECONDARY_BUTTON = 2;
        if (e.button == SECONDARY_BUTTON) {
            store.dispatch(setMouseDown(true));
            return;
        }

        const [clickX, clickY] = [e.offsetX, e.offsetY];
        const { cameraScale, cameraX, cameraY } = store.getState().scene;
        const [worldX, worldY] = screenToWorld([clickX, clickY], canvas, {
            scale: cameraScale,
            width: (cameraScale * canvas.width) / canvas.height,
            height: cameraScale,
            x: cameraX,
            y: cameraY,
        });

        const { textureWidth, textureHeight } = program;

        // Image will always be centred at (0, 0); test if the click was in that image
        if (
            -textureWidth / 2 <= worldX &&
            worldX <= textureWidth / 2 &&
            -textureHeight / 2 <= worldY &&
            worldY <= textureHeight / 2
        ) {
            const { imageWidth: width, imageHeight: height } =
                store.getState().scene;
            // Now find the pixel to paint

            const { cameraScale } = store.getState().scene;

            // Right should be positive X
            const localX = worldX - -textureWidth / 2;
            // Down should be positive Y
            const localY = textureHeight / 2 - worldY;

            const pixelX = Math.floor(width * localX);
            const pixelY = Math.floor(height * localY);

            const colorPicker = document.getElementById(
                'color-picker'
            ) as HTMLInputElement;
            if (!colorPicker) {
                throw new Error('The color picker element could not be found.');
            }

            const color = [...parseColorInput(colorPicker.value), 0xff];
            const color32 =
                (color[0] << (0 * 8)) |
                (color[1] << (1 * 8)) |
                (color[2] << (2 * 8)) |
                (color[3] << (3 * 8));

            store.dispatch(
                setImagePixel({
                    xy: { x: pixelX, y: pixelY },
                    color: color32,
                })
            );

            program.update();
        }
    };

    canvas.onmousemove = e => {
        const [deltaX, deltaY] = [e.movementX, e.movementY];
        const { mouseDown } = store.getState().scene;

        const { cameraScale } = store.getState().scene;
        const [moveX, moveY] = screenToWorldUnits([deltaX, deltaY], canvas, {
            width: (cameraScale * canvas.width) / canvas.height,
            height: cameraScale,
            scale: cameraScale,
            x: store.getState().scene.cameraX,
            y: store.getState().scene.cameraY,
        });

        if (mouseDown) {
            store.dispatch(addCameraPosition({ x: moveX, y: moveY }));
        }
        program.update();
    };

    canvas.onmouseup = e => {
        e.preventDefault();

        const SECONDARY_BUTTON = 2;
        if (e.button == SECONDARY_BUTTON) {
            store.dispatch(setMouseDown(false));
        }
        program.update();
    };

    canvas.onwheel = e => {
        e.preventDefault();

        if (e.deltaY !== 0) {
            const direction = Math.sign(e.deltaY);
            const scalePercentage = 1.0 + 0.07 * direction;
            store.dispatch(multiplyCameraScale(scalePercentage));
            program.update();
        }
    };

    const downloadButton = document.getElementById('image-download');

    if (downloadButton) {
        downloadButton.onclick = function (ev) {};
    }
}

export function parseColorInput(string: string) {
    const matchResult = string.match(/^#([0-9a-f]{6})$/i);
    if (matchResult && matchResult[1]) {
        const match = matchResult[1];
        return [
            parseInt(match.substr(0, 2), 16),
            parseInt(match.substr(2, 2), 16),
            parseInt(match.substr(4, 2), 16),
        ];
    } else {
        return [0, 0, 0];
    }
}

export { setupInput };
