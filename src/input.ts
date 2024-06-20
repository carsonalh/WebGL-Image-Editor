import store, {
    addCameraPosition,
    setImage,
    setImageSize,
    setLeftMouseDown,
    setRightMouseDown,
    setTool,
} from './store';
import { screenToWorld, screenToWorldUnits } from './camera';
import { multiplyCameraScale } from './store';
import { Program } from './webgl';
import { Bmp } from './image-bmp';
import { Image } from './image';
import { onMouseDown, onMouseMove, onMouseUp, onMouseWheel } from './interface';
import { DotTool, LineTool } from './tool';

const tools = {
    'dot': new DotTool(),
    'line': new LineTool(),
};

function setupInput(canvas: HTMLCanvasElement, program: Program) {
    // We want to disable the context menu when right clicking on the canvas.
    // This should do the trick (thanks SO).
    canvas.oncontextmenu = e => {
        e.preventDefault();
        e.stopPropagation();
    };

    canvas.onmousedown = e => {
        e.preventDefault();

        const PRIMARY_BUTTON = 0;
        const SECONDARY_BUTTON = 2;

        let button = null;

        if (e.button === PRIMARY_BUTTON) {
            button = 'primary';
        } else if (e.button === SECONDARY_BUTTON) {
            button = 'secondary';
        }
        // we don't use middle button as of yet

        if (null !== button) {
            const mouseDownEvent = {
                x: e.offsetX,
                y: e.offsetY,
                button: button as 'primary' | 'secondary'
            };

            onMouseDown(canvas, program, mouseDownEvent);
        }
    };

    canvas.onmousemove = e => {
        const mouseMoveEvent = {
            x: e.offsetX,
            y: e.offsetY,
            deltaX: e.movementX,
            deltaY: e.movementY,
        };
        onMouseMove(canvas, program, mouseMoveEvent);
    };

    canvas.onmouseup = e => {
        e.preventDefault();

        const PRIMARY_BUTTON = 0;
        const SECONDARY_BUTTON = 2;

        let button = null;

        if (e.button === PRIMARY_BUTTON) {
            button = 'primary';
        } else if (e.button === SECONDARY_BUTTON) {
            button = 'secondary';
        }
        // we don't use middle button as of yet

        if (null !== button) {
            const mouseUpEvent = {
                x: e.offsetX,
                y: e.offsetY,
                button: button as 'primary' | 'secondary'
            };

            onMouseUp(canvas, program, mouseUpEvent);
        }
    };

    canvas.onwheel = e => {
        e.preventDefault();

        onMouseWheel(canvas, program, e);
    };

    const downloadButton = document.getElementById('image-download');

    if (downloadButton) {
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
                const data = new Array<number>(4 * width * height).fill(0x00);
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

                store.dispatch(setImage({ width, height, data }));

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
        const { imageHeight } = store.getState().scene;

        store.dispatch(setImageSize({ width: newWidth, height: imageHeight }));

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
        const { imageWidth } = store.getState().scene;

        store.dispatch(setImageSize({ width: imageWidth, height: newHeight }));

        program.updateBuffers();
        program.updateImageData();
        program.render();
    };

    const toolSelector = document.getElementById('tool-selector');

    if (toolSelector == null) {
        throw new Error('Tool selector should not have been null');
    }

    toolSelector.onchange = function(e) {
        e.preventDefault();
        const target = e.target;
        if (!target) throw new Error('The event target was null');

        if (!(target instanceof HTMLSelectElement)) {
            throw new Error('The event target was not an input element');
        }

        store.dispatch(setTool(target.value));
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
        throw new Error('unhandled color input ' + string);
    }
}

export { setupInput };
