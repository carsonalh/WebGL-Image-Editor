import { getProgramInfo } from "./programInfo";

function setupInput(canvas) {
    canvas.onclick = function(ev) {
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

            program.textureData[pixelIndex + 0] = 0x00;
            program.textureData[pixelIndex + 1] = 0x00;
            program.textureData[pixelIndex + 2] = 0xFF;
            program.textureData[pixelIndex + 3] = 0xFF;
            program.update();
        }
    };
}

export { setupInput };
