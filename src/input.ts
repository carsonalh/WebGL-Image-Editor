import store, {
    addCameraPosition,
    initialiseDisplayMask,
    setImage,
    setImageData,
    setImagePixel,
    setImageSize,
    setLeftMouseDown,
    setRightMouseDown,
    setStartXY,
    setTool,
} from './store';
import { screenToWorld, screenToWorldUnits } from './camera';
import { multiplyCameraScale } from './store';
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

        store.dispatch(setLeftMouseDown(true));

        const PRIMARY_BUTTON = 0;
        const SECONDARY_BUTTON = 2;

        const [clickX, clickY] = [e.offsetX, e.offsetY];
        const { cameraScale, cameraX, cameraY, imageWidth, imageHeight } =
            store.getState().scene;
        const [worldX, worldY] = screenToWorld([clickX, clickY], canvas, {
            scale: cameraScale,
            width: (cameraScale * canvas.width) / canvas.height,
            height: cameraScale,
            x: cameraX,
            y: cameraY,
        });

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

        switch (e.button) {
            case PRIMARY_BUTTON: 
            switch (store.getState().scene.tool) {
            case 'dot': {
                    if (
                        -imageWidth / 2 <= worldX &&
                        worldX <= imageWidth / 2 &&
                        -imageHeight / 2 <= worldY &&
                        worldY <= imageHeight / 2
                    ) {

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

                        store.dispatch(
                            setImagePixel({
                                xy: { x: pixelX, y: pixelY },
                                color: color32,
                            })
                        );

                        program.updateImageData();
                        program.render();
                    }
                }
                break;
                case 'line': {
                    if (
                        -imageWidth / 2 <= worldX &&
                        worldX <= imageWidth / 2 &&
                        -imageHeight / 2 <= worldY &&
                        worldY <= imageHeight / 2
                    ) {
                        console.log('Hit the image with line tool!');
                        const displayMask = new Array(imageWidth * imageHeight).fill(0);
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

                        // On the first click, the mask should have the pixel it was clicked on set to 1
                        displayMask[pixelY * imageWidth + pixelX] = 1;

                        store.dispatch(setStartXY([pixelX, pixelY]));
                        store.dispatch(
                            initialiseDisplayMask([[imageWidth, imageHeight], displayMask])
                        );
                    }
                }
                break;
            }
            break;
            case SECONDARY_BUTTON: {
                store.dispatch(setRightMouseDown(true));
            }
            break;
        }

    };

    canvas.onmousemove = e => {
        const [deltaX, deltaY] = [e.movementX, e.movementY];
        const { leftMouseDown, rightMouseDown } = store.getState().scene;


        const { cameraScale } = store.getState().scene;
        const [moveX, moveY] = screenToWorldUnits([deltaX, deltaY], canvas, {
            width: (cameraScale * canvas.width) / canvas.height,
            height: cameraScale,
            scale: cameraScale,
            x: store.getState().scene.cameraX,
            y: store.getState().scene.cameraY,
        });

        if (rightMouseDown) {
            store.dispatch(addCameraPosition({ x: moveX, y: moveY }));
        }

        if (leftMouseDown) {
            const { tool } = store.getState().scene;

            if (tool === 'line') {
                // update the line tool
                // add a tool tip
            } else if (tool === 'dot') {
                // update the dot tool, nothing to do really
            }
        }

        program.updateScene();
        program.render();
    };

    canvas.onmouseup = e => {
        e.preventDefault();
        const [clickX, clickY] = [e.offsetX, e.offsetY];
        const { cameraScale, cameraX, cameraY, imageWidth, imageHeight } =
            store.getState().scene;
        const [worldX, worldY] = screenToWorld([clickX, clickY], canvas, {
            scale: cameraScale,
            width: (cameraScale * canvas.width) / canvas.height,
            height: cameraScale,
            x: cameraX,
            y: cameraY,
        });

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

        const PRIMARY_BUTTON = 0;
        const SECONDARY_BUTTON = 2;

        const { tool } = store.getState().scene;

        if (e.button == SECONDARY_BUTTON) {
            store.dispatch(setRightMouseDown(false));
        } else if (e.button == PRIMARY_BUTTON) {
            if (tool === 'line') {
                // draw the line on the image
                if (
                    -imageWidth / 2 <= worldX &&
                    worldX <= imageWidth / 2 &&
                    -imageHeight / 2 <= worldY &&
                    worldY <= imageHeight / 2
                ) {
                    const { pixelStartX, pixelStartY } = store.getState().lineTool;

                    if (pixelStartX == null || pixelStartY == null) {
                        throw new Error('Line tool pixel start xy cannot be nullish');
                    }

                    // We want to think of drawing a line out from the origin
                    const xAdjusted = pixelX - pixelStartX;
                    const yAdjusted = pixelY - pixelStartY;

                    console.log(`drawing a line from (${pixelStartX}, ${pixelStartY}) to (${pixelX}, ${pixelY})`);

                    // We want to select the outermost corner for our ending x
                    // and y to be the representative for our maths
                    if (xAdjusted == 0 && yAdjusted == 0) {
                        // draw a dot
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
                    } else if (yAdjusted == 0) {
                        // draw a straight line
                        console.log('drawing a straight horizontal line with constant y');

                        const direction = Math.sign(pixelX - pixelStartX);
                        for (let xi = pixelStartX; Math.abs(xi - pixelStartX) <= Math.abs(pixelX - pixelStartX); xi += direction) {
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
                                    xy: { x: xi, y: pixelY },
                                    color: color32,
                                })
                            );
                        }
                    } else if (xAdjusted == 0) {
                        console.log('drawing a straight vertical line with constant x');
                        // draw a straight line
                        const direction = Math.sign(pixelY - pixelStartY);
                        for (let yi = pixelStartY; Math.abs(yi - pixelStartY) <= Math.abs(pixelY - pixelStartY); yi += direction) {
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
                                    xy: { x: pixelX, y: yi },
                                    color: color32,
                                })
                            );
                        }
                    } else {
                        let repEndX: number | null = null;
                        let repEndY: number | null = null;
                        let repStartX: number | null = null;
                        let repStartY: number | null = null;
                        // Not viertical or horizontal way, we now select the
                        // Not viertical or horizontal way, we now select the
                        // 'representative point' at which the line ends, all in
                        // pixel coordinates
                        if (xAdjusted >= 0 && yAdjusted > 0) {
                            repEndX = xAdjusted + 1;
                            repEndY = yAdjusted + 1;
                            repStartX = 0;
                            repStartY = 0;
                        } else if (xAdjusted < 0 && yAdjusted >= 0) {
                            repEndX = xAdjusted;
                            repEndY = yAdjusted + 1;
                            repStartX = 1;
                            repStartY = 0;
                        } else if (xAdjusted > 0 && yAdjusted <= 0) {
                            repEndX = xAdjusted + 1;
                            repEndY = yAdjusted;
                            repStartX = 0;
                            repStartY = 1;
                        } else if (xAdjusted <= 0 && yAdjusted < 0) {
                            repEndX = xAdjusted;
                            repEndY = yAdjusted;
                            repStartX = 1;
                            repStartY = 1;
                        }

                        if (repEndX == null || repEndY == null || repStartX == null || repStartY == null) {
                            throw new Error('Critical: unhandled case');
                        }

                        // We represent the line as y = mx + b
                        const startX = repStartX + pixelStartX;
                        const startY = repStartY + pixelStartY;
                        const endX = repEndX + pixelStartX;
                        const endY = repEndY + pixelStartY;

                        const slope = (repEndY - repStartY) / (repEndX - repStartX);

                        // Now we have two cases of interest: |slope| <= 1, |slope| > 1
                        if (Math.abs(slope) <= 1) {
                            const m = (endY - startY) / (endX - startX);
                            const b = startY - m * startX;

                            const direction = Math.sign(endX - startX);

                            for (let xi = startX;
                                    Math.abs(xi - startX) < Math.abs(endX - startX);
                                    xi += direction) {
                                const y0 = m * xi + b;
                                const y1 = m * (xi + 1) + b;

                                if (Math.floor(y0) == Math.floor(y1)) {
                                    // We colour xi, y0
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
                                            xy: { x: xi, y: Math.floor(y0) },
                                            color: color32,
                                        })
                                    );
                                } else {
                                    // We make a decision between xi, floor(y0)
                                    // and xi, floor(y1)

                                    // Let us find the pixel which intersects
                                    // the line more.

                                    // We use the integral area the line makes
                                    // between the two pixels in the x direction

                                    // Since our gradient should have magnitude
                                    // <= 1, this should never fail (in fact
                                    // always be 1, since we have handled the
                                    // zero case)
                                    if (Math.abs(Math.floor(y0) - Math.floor(y1)) !== 1) {
                                        throw new Error('invalid case');
                                    }

                                    const offset = Math.max(Math.floor(y0), Math.floor(y1));

                                    // x2 - x1 always equals 1
                                    const area = (m / 2) * ((xi + 1) ** 2 - xi ** 2) + (b - offset)

                                    const fy0 = Math.floor(y0);
                                    const fy1 = Math.floor(y1);
                                    const colouredY = area > 0 ? Math.max(fy0, fy1) : Math.min(fy0, fy1);

                                    // we colour xi, colouredY
                                    console.log(`coloring hard case at (${xi}, ${colouredY})`);

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
                                            xy: { x: xi, y: colouredY },
                                            color: color32,
                                        })
                                    );
                                }
                            }
                        } else {
                            // We model this as x = my + b
                            const m = (endX - startX) / (endY - startY);
                            const b = startX - m * startY;

                            // We iterate over the ys
                            const direction = Math.sign(endY - startY);
                            for (let yi = startY;
                                    Math.abs(yi - startY) < Math.abs(endY - startY);
                                    yi += direction) {
                                const x0 = m * yi + b;
                                const x1 = m * (yi + 1) + b;

                                if (Math.floor(x0) == Math.floor(x1)) {
                                    // Colour (x0, yi)
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
                                            xy: { x: Math.floor(x0), y: yi },
                                            color: color32,
                                        })
                                    );
                                } else {
                                    // Find the pixel with the greatest area
                                    // intersection
                                    // \int_{y_0}^{y_1} x(y) \, dy, which is
                                    // greater than zero if we should choose the
                                    // greater x
                                    const offset = Math.min(Math.floor(x0), Math.floor(x1));
                                    const area = (m / 2) * ((yi + 1) ** 2 - yi ** 2) + (b - offset);

                                    const fx0 = Math.floor(x0);
                                    const fx1 = Math.floor(x1);
                                    const colouredX = area > 0 ? Math.max(fx0, fx1) : Math.min(fx0, fx1);

                                    // we colour y0, colouredX
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
                                            xy: { x: colouredX, y: yi },
                                            color: color32,
                                        })
                                    );
                                }
                            }
                        }
                    }
                }
            }
            store.dispatch(setLeftMouseDown(false));
        }

        program.updateImageData();
        program.render();
    };

    canvas.onwheel = e => {
        e.preventDefault();

        if (e.deltaY !== 0) {
            const direction = Math.sign(e.deltaY);
            const scalePercentage = 1.0 + 0.07 * direction;
            store.dispatch(multiplyCameraScale(scalePercentage));

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
        return [0, 0, 0];
    }
}

export { setupInput };
