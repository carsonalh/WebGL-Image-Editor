import { getProgramInfo } from "./programInfo";

function setupInput(canvas) {
    canvas.onmousedown = function(ev) {
        ev.preventDefault();
        const [clickX, clickY] = [ev.offsetX, ev.offsetY];
        const program = getProgramInfo();
        const { camera } = program;
        const [worldX, worldY] = camera.screenToWorld([clickX, clickY], canvas);
        
        const { textureWidth, textureHeight, texturePixelLength } = program;

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

            const pixelX = Math.floor(texturePixelLength * localX);
            const pixelY = Math.floor(texturePixelLength * localY);

            // Make it blue (for now)
            const pixelIndex = 4 * (texturePixelLength * pixelY + pixelX);

            const colorPicker = document.getElementById('color-picker');
            if (!colorPicker) {
                throw new Error('The color picker element could not be found.');
            }

            const color = parseColorInput(colorPicker.value);

            program.textureData[pixelIndex + 0] = color[0];
            program.textureData[pixelIndex + 1] = color[1];
            program.textureData[pixelIndex + 2] = color[2];
            program.textureData[pixelIndex + 3] = 0xFF;
            program.update();
        }
    };

    canvas.onwheel = function(ev) {
        ev.preventDefault();
        const program = getProgramInfo();
        const { camera } = program;
        
        if (ev.deltaY !== 0) {
            const direction = Math.sign(ev.deltaY);
            camera.multiplyScale(1 + (0.05 * direction));
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
