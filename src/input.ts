import {
    addCameraPosition,
    setImageSize,
    setImagePixel,
    setImage,
    getState,
    setMouseDown,
    multiplyCameraScale,
} from './state';
import { screenToWorld, screenToWorldUnits } from './camera';
import { Program } from './webgl';
import { Bmp } from './image-bmp';
import { Image } from './image';

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
            setMouseDown(true);
            return;
        }

        const [clickX, clickY] = [e.offsetX, e.offsetY];
        const { cameraX, cameraY, imageWidth, imageHeight, cameraScale } =
            getState();
        const [worldX, worldY] = screenToWorld([clickX, clickY], canvas, {
            scale: cameraScale,
            width: (cameraScale * canvas.width) / canvas.height,
            height: cameraScale,
            x: cameraX,
            y: cameraY,
        });

        if (
            -imageWidth / 2 <= worldX &&
            worldX <= imageWidth / 2 &&
            -imageHeight / 2 <= worldY &&
            worldY <= imageHeight / 2
        ) {
            // TODO: Eventually clean this mess up; not now though...
            const createMapper =
                (
                    fromStart: number,
                    fromEnd: number,
                    toStart: number,
                    toEnd: number
                ) =>
                (x: number) => {
                    // Get where x is from fromStart (0) to fromEnd (1) as a percentage
                    const fromPercent = (x - fromStart) / (fromEnd - fromStart);
                    // Apply that percentage to the 'to' range
                    const to = toStart + fromPercent * (toEnd - toStart);
                    return to;
                };

            const worldToPixelX = createMapper(
                -imageWidth / 2,
                imageWidth / 2,
                0,
                imageWidth
            );
            const worldToPixelY = createMapper(
                -imageHeight / 2,
                imageHeight / 2,
                imageHeight,
                0
            );

            const pixelX = Math.floor(worldToPixelX(worldX));
            const pixelY = Math.floor(worldToPixelY(worldY));

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

            setImagePixel(pixelX, pixelY, color32);

            program.updateImageData();
            program.render();
        }
    };

    canvas.onmousemove = e => {
        const [deltaX, deltaY] = [e.movementX, e.movementY];
        const { cameraX, cameraY, cameraScale, mouseDown } = getState();

        const [moveX, moveY] = screenToWorldUnits([deltaX, deltaY], canvas, {
            width: (cameraScale * canvas.width) / canvas.height,
            height: cameraScale,
            scale: cameraScale,
            x: cameraX,
            y: cameraY,
        });

        if (mouseDown) {
            addCameraPosition(moveX, moveY);
        }

        program.updateScene();
        program.render();
    };

    canvas.onmouseup = e => {
        e.preventDefault();

        const SECONDARY_BUTTON = 2;
        if (e.button == SECONDARY_BUTTON) {
            setMouseDown(false);
        }
        // program.render();
    };

    canvas.onwheel = e => {
        e.preventDefault();

        if (e.deltaY !== 0) {
            const direction = Math.sign(e.deltaY);
            const scalePercentage = 1.0 + 0.07 * direction;
            multiplyCameraScale(scalePercentage);

            program.updateScene();
            program.render();
        }
    };

    const downloadButton = document.getElementById('image-download');

    if (downloadButton) {
        downloadButton.onclick = function (ev) {
            // NOTE: Everything you see in this function is a horrible mess to just
            // get the bare minimum working
            // Do not ship or rely on anything you see here

            const { imageWidth, imageHeight, glImageData } = getState();

            const redChannel = new Uint8Array(imageWidth * imageHeight);
            const blueChannel = new Uint8Array(imageWidth * imageHeight);
            const greenChannel = new Uint8Array(imageWidth * imageHeight);

            const imageData = new Uint8Array(glImageData);

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
                width: imageWidth,
                height: imageHeight,
                redChannel: redChannel.buffer,
                blueChannel: blueChannel.buffer,
                greenChannel: greenChannel.buffer,
            });

            const blob = new Blob([Bmp.write(bmp)]);
            const url = URL.createObjectURL(blob);

            let a = document.createElement('a');
            a.href = url;
            a.download = 'image.bmp';
            a.click();
        };
    }

    const fileChooser = document.getElementById('image-upload');

    let file: null | File = null;

    if (fileChooser && fileChooser instanceof HTMLInputElement) {
        fileChooser.addEventListener(
            'change',
            async function () {
                // Perhaps add some validation for this list
                const { files } = this;
                if (files?.length) {
                    file = files.item(0);
                    if (file) {
                        console.log(
                            `Found a file of length ${Math.round(
                                file.size / 1024
                            )}K`
                        );
                    }
                } else {
                    console.log('No files were given');
                }
            },
            false
        );
    }

    const uploadButton = document.getElementById('upload-button');

    if (uploadButton) {
        uploadButton.onclick = async function (e) {
            if (file !== null) {
                const buffer = await file.arrayBuffer();
                let image: null | Image = null;
                try {
                    image = Bmp.read(buffer);
                } catch (e) {
                    if (!(e instanceof Error)) {
                        console.error(e);
                        return;
                    } else {
                        e.stack && console.error(e.stack);
                        console.error(e.message);
                        return;
                    }
                }

                const { width, height } = image;
                const data = new Uint8Array(4 * width * height).fill(0x00);
                // These typed arrays should only read and not write data
                const redBytes = new Uint8Array(image.redChannel);
                const greenBytes = new Uint8Array(image.greenChannel);
                const blueBytes = new Uint8Array(image.blueChannel);

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const index = y * width + x;
                        // 4 bytes per pixel (RGBA)
                        const px = 4 * index;
                        data[px + 0] = redBytes[index];
                        data[px + 1] = greenBytes[index];
                        data[px + 2] = blueBytes[index];
                        data[px + 3] = 0xff;
                    }
                }

                setImage(width, height, data.buffer);

                program.updateImageData();
                program.updateBuffers();
                program.render();
            }
        };
    }

    const widthInput = document.querySelector(
        'input[type="number"]#image-width'
    ) as HTMLInputElement | null;
    const heightInput = document.querySelector(
        'input[type="number"]#image-height'
    ) as HTMLInputElement | null;

    if (!widthInput) {
        throw new Error('Could not find the image width input in the dom');
    }

    if (!heightInput) {
        throw new Error('Could not find the image height input in the dom');
    }

    widthInput.onchange = function (e) {
        e.preventDefault();
        const target = e.target;
        if (!target) throw new Error('The event target was null');

        if (!(target instanceof HTMLInputElement)) {
            throw new Error('The event target was not an input element');
        }

        const newWidth = Number(target.value);
        const { imageHeight } = getState();

        setImageSize(newWidth, imageHeight);

        program.updateBuffers();
        program.updateImageData();
        program.render();
    };

    heightInput.onchange = function (e) {
        e.preventDefault();
        const target = e.target;
        if (!target) throw new Error('The event target was null');

        if (!(target instanceof HTMLInputElement)) {
            throw new Error('The event target was not an input element');
        }

        const newHeight = Number(target.value);
        const { imageWidth } = getState();

        setImageSize(imageWidth, newHeight);

        program.updateBuffers();
        program.updateImageData();
        program.render();
    };
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
