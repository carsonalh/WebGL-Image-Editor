import store, { addCameraPosition, setImagePixel, setMouseDown } from './store';
import { screenToWorld, screenToWorldUnits } from './camera';
import { multiplyCameraScale } from './store';
import { Program } from './webgl';
import { Bmp } from './bmp';

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

    downloadButton.onclick = function (ev) {
        // NOTE: Everything you see in this function is a horrible mess to just
        // get the bare minimum working
        // Do not ship or rely on anything you see here

        const { imageWidth, imageHeight } = store.getState().scene;
        const { imageData } = store.getState().scene;

        const redChannel = new Uint8Array(imageWidth * imageHeight);
        const blueChannel = new Uint8Array(imageWidth * imageHeight);
        const greenChannel = new Uint8Array(imageWidth * imageHeight);

        for (let y = 0; y < imageHeight; y++) {
            for (let x = 0; x < imageWidth; x++) {
                const px = y * imageWidth + x;

                const red = imageData[4 * px + 0];
                const green = imageData[4 * px + 1];
                const blue = imageData[4 * px + 2];

                blueChannel[px] = blue;
                greenChannel[px] = green;
                redChannel[px] = red;
            }
        }

        const bmp = Bmp.create({
            width: 32,
            height: 32,
            redChannel,
            blueChannel,
            greenChannel,
        });

        const blob = new Blob([bmp.toBuffer()]);
        const url = URL.createObjectURL(blob);

        let a = document.createElement('a');
        a.href = url;
        a.download = 'image.bmp';
        a.click();
    };
}

export function parseColorInput(string: string) {
    let m;
    if ((m = string.match(/^#([0-9a-f]{6})$/i)[1])) {
        return [
            parseInt(m.substr(0, 2), 16),
            parseInt(m.substr(2, 2), 16),
            parseInt(m.substr(4, 2), 16),
        ];
    }
}

export { setupInput };
