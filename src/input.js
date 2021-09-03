import store from './store';
import { screenToWorld } from "./camera";
import { getProgramInfo } from "./programInfo";
import { multiplyCameraScale } from "./store";

function setupInput(canvas) {
    canvas.onmousedown = function(ev) {
        ev.preventDefault();
        const [clickX, clickY] = [ev.offsetX, ev.offsetY];
        const program = getProgramInfo();
        const [worldX, worldY] = screenToWorld([clickX, clickY], canvas, {
            width: canvas.width / canvas.height,
            height: 1
        });
        
        const { textureWidth, textureHeight, textureSprite: sprite } = program;

        // Image will always be centred at (0, 0); test if the click was in that image
        if (
            (-textureWidth / 2 <= worldX && worldX <= textureWidth / 2) &&
            (-textureHeight / 2 <= worldY && worldY <= textureHeight / 2)
        ) {
            // Now find the pixel to paint

            // Right should be positive X
            const localX = worldX - (-textureWidth / 2);
            // Down should be positive Y
            const localY = (textureHeight / 2) - worldY;

            const pixelX = Math.floor(sprite.width * localX);
            const pixelY = Math.floor(sprite.height * localY);

            const colorPicker = document.getElementById('color-picker');
            if (!colorPicker) {
                throw new Error('The color picker element could not be found.');
            }

            const color = [...parseColorInput(colorPicker.value), 0xFF];

            sprite.setPixel([pixelX, pixelY], color);
            program.update();
        }
    };

    canvas.onwheel = function(ev) {
        ev.preventDefault();
        const program = getProgramInfo();
        
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
