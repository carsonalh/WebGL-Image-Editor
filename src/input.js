import store, { setImagePixel } from './store';
import { screenToWorld } from "./camera";
import { multiplyCameraScale } from "./store";

function setupInput(canvas, program) {
    canvas.onmousedown = (ev) => {
        ev.preventDefault();
        const [clickX, clickY] = [ev.offsetX, ev.offsetY];
        const [worldX, worldY] = screenToWorld([clickX, clickY], canvas, {
            width: canvas.width / canvas.height,
            height: 1
        });
        
        const { textureWidth, textureHeight } = program;

        // Image will always be centred at (0, 0); test if the click was in that image
        if (
            (-textureWidth / 2 <= worldX && worldX <= textureWidth / 2) &&
            (-textureHeight / 2 <= worldY && worldY <= textureHeight / 2)
        ) {
            const { imageWidth: width, imageHeight: height } = store.getState().scene;
            // Now find the pixel to paint

            // Right should be positive X
            const localX = worldX - (-textureWidth / 2);
            // Down should be positive Y
            const localY = (textureHeight / 2) - worldY;

            const pixelX = Math.floor(width * localX);
            const pixelY = Math.floor(height * localY);

            const colorPicker = document.getElementById('color-picker');
            if (!colorPicker) {
                throw new Error('The color picker element could not be found.');
            }

            const color = [...parseColorInput(colorPicker.value), 0xFF];
            const color32 =
                (color[0] << (0 * 8)) |
                (color[1] << (1 * 8)) |
                (color[2] << (2 * 8)) |
                (color[3] << (3 * 8));

            store.dispatch(setImagePixel({
                xy: { x: pixelX, y: pixelY },
                color: color32
            }));

            program.update();
        }
    };

    canvas.onwheel = (ev) => {
        ev.preventDefault();

        if (ev.deltaY !== 0) {
            const direction = Math.sign(ev.deltaY);
            const scalePercentage = 1.00 + 0.07 * direction;
            store.dispatch(multiplyCameraScale(scalePercentage));
            program.update();
        }
    };

    const downloadButton = document.getElementById('image-download');

    downloadButton.onclick = function(ev) {
    };
}

function parseColorInput(string) {
    let m;
    if (m = string.match(/^#([0-9a-f]{6})$/i)[1]) {
        return [
            parseInt(m.substr(0, 2), 16),
            parseInt(m.substr(2, 2), 16),
            parseInt(m.substr(4, 2), 16)
        ];
    }
}

export { setupInput };
