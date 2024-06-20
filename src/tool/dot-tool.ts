import store, { setImagePixel } from '../store';
import { Tool } from '.';

export default class DotTool implements Tool {
    onMouseDown(imageX: number, imageY: number): void {
        const pixelX = Math.floor(imageX);
        const pixelY = Math.floor(imageY);

        const { imageWidth, imageHeight } = store.getState().scene;

        if (
            0 <= imageX && imageX < imageWidth &&
            0 <= imageY && imageY < imageHeight
        ) {
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
        }
    }

    onMouseUp(imageX: number, imageY: number): void {}
}