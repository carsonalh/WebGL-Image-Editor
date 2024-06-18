// our tool will work like this:
// begin: give the tool everything it needs to begin, a copy of the entire state, which it can copy into its own state all that it might need
// update: update it whenever the state updates, with a handle to the new state
// end: let it overwrite the real state with the updates

import { screenToWorld } from '../camera';
import store, {
    setImagePixel,
    setStartXY,
} from '../store';

type SceneState = ReturnType<typeof store.getState>['scene'];

type LineToolState = ReturnType<typeof store.getState>['lineTool'];

export interface ToolInterface {
    onMouseDown(imageX: number, imageY: number): void;
    onMouseUp(imageX: number, imageY: number): void;
}

export default class LineTool implements ToolInterface {
    onMouseDown(imageX: number, imageY: number): void {
        console.log('onmousedown!!')
        const pixelX = Math.floor(imageX);
        const pixelY = Math.floor(imageY);

        store.dispatch(setStartXY([pixelX, pixelY]));
    }

    onMouseUp(imageX: number, imageY: number): void {
        const pixelX = Math.floor(imageX);
        const pixelY = Math.floor(imageY);

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

            // const color = [...parseColorInput(colorPicker.value), 0xff];
            const color32 = 0xff0000ff;
                // (color[0] << (0 * 8)) |
                // (color[1] << (1 * 8)) |
                // (color[2] << (2 * 8)) |
                // (color[3] << (3 * 8));

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

                // const color = [...parseColorInput(colorPicker.value), 0xff];
                const color32 = 0xff0000ff;
                    // (color[0] << (0 * 8)) |
                    // (color[1] << (1 * 8)) |
                    // (color[2] << (2 * 8)) |
                    // (color[3] << (3 * 8));

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

                // const color = [...parseColorInput(colorPicker.value), 0xff];
                const color32 = 0xff0000ff;
                    // (color[0] << (0 * 8)) |
                    // (color[1] << (1 * 8)) |
                    // (color[2] << (2 * 8)) |
                    // (color[3] << (3 * 8));


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

                        // const color = [...parseColorInput(colorPicker.value), 0xff];
                        const color32 = 0xff0000ff;
                            // (color[0] << (0 * 8)) |
                            // (color[1] << (1 * 8)) |
                            // (color[2] << (2 * 8)) |
                            // (color[3] << (3 * 8));

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

                        // const color = [...parseColorInput(colorPicker.value), 0xff];
                        const color32 = 0xff0000ff;
                            // (color[0] << (0 * 8)) |
                            // (color[1] << (1 * 8)) |
                            // (color[2] << (2 * 8)) |
                            // (color[3] << (3 * 8));

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

                        // const color = [...parseColorInput(colorPicker.value), 0xff];
                        const color32 = 0xff0000ff;
                            // (color[0] << (0 * 8)) |
                            // (color[1] << (1 * 8)) |
                            // (color[2] << (2 * 8)) |
                            // (color[3] << (3 * 8));


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

                        // const color = [...parseColorInput(colorPicker.value), 0xff];
                        const color32 = 0xff0000ff;
                            // (color[0] << (0 * 8)) |
                            // (color[1] << (1 * 8)) |
                            // (color[2] << (2 * 8)) |
                            // (color[3] << (3 * 8));

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
