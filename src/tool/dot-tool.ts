import store, { setImagePixel } from '../store';
import { Tool } from '.';
import { parseColorInput } from '../input';

export default class DotTool implements Tool {
    onMouseDown(imageX: number, imageY: number): void {
        const pixelX = Math.floor(imageX);
        const pixelY = Math.floor(imageY);

        const { imageWidth, imageHeight } = store.getState().scene;

        if (
            0 <= imageX && imageX < imageWidth &&
            0 <= imageY && imageY < imageHeight
        ) {
            const color32 = store.getState().scene.color;

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