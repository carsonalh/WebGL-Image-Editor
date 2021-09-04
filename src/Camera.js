import { mat4 } from 'gl-matrix';

export function screenToWorld([x, y], canvas, cameraInfo) {
    const createMapper = (fromStart, fromEnd, toStart, toEnd) => x => {
        // Get where x is from fromStart (0) to fromEnd (1) as a percentage
        const fromPercent = (x - fromStart) / (fromEnd - fromStart);
        // Apply that percentage to the 'to' range
        const to = toStart + fromPercent * (toEnd - toStart);
        return to;
    };

    const mapX = createMapper(0, canvas.width, -cameraInfo.width / 2, cameraInfo.width / 2);
    const mapY = createMapper(0, canvas.height, cameraInfo.height / 2, -cameraInfo.height / 2);
    return [mapX(x) - cameraInfo.x, mapY(y) - cameraInfo.y];
}

export function screenToWorldUnits([x, y], canvas, cameraInfo) {
    const scaleRatio = cameraInfo.height / canvas.height;
    const aspectRatio = cameraInfo.width / cameraInfo.height;
    return [scaleRatio * x, -scaleRatio * y];
}

export function getCameraMatrix(cameraInfo) {
    const mat = mat4.create();

    const left = -cameraInfo.scale * cameraInfo.aspectRatio / 2;
    const right = cameraInfo.scale * cameraInfo.aspectRatio / 2;
    const bottom = -cameraInfo.scale * 1 / 2;
    const top = cameraInfo.scale * 1 / 2;
    const near = -1;
    const far = 1;

    mat4.ortho(mat, left, right, bottom, top, near, far);
    mat4.translate(mat, mat, [cameraInfo.x, cameraInfo.y, 0])

    return mat;
}
