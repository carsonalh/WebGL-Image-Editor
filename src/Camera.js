import { mat4 } from 'gl-matrix';

class Camera {
    constructor(aspectRatio) {
        this._scale = 1;
        this._aspectRatio = aspectRatio;
    }

    resetScale() {
        this._scale = 1;
    }

    setScale(scale) {
        if (scale <= 0) {
            throw new RangeError('The camera\'s scale must be positive.');
        }

        this._scale = scale;
    }
    
    multiplyScale(scale) {
        if (scale <= 0) {
            throw new RangeError('A scale multiplier must be positive.');
        }
    
        this._scale *= scale;
    }

    getProjectionMatrix() {
        const mat = mat4.create();

        const left = - this._scale * this._aspectRatio / 2;
        const right = this._scale * this._aspectRatio / 2;
        const bottom = - this._scale * 1 / 2;
        const top = this._scale * 1 / 2;
        const near = -1;
        const far = 1;

        mat4.ortho(mat, left, right, bottom, top, near, far);

        return mat;
    }

    screenToWorld([x, y], canvas) {
        const createMapper = (fromStart, fromEnd, toStart, toEnd) => x => {
            // Get where x is from fromStart (0) to fromEnd (1) as a percentage
            const fromPercent = (x - fromStart) / (fromEnd - fromStart);
            // Apply that percentage to the 'to' range
            const to = toStart + fromPercent * (toEnd - toStart);
            return to;
        };
    
        const mapX = createMapper(0, canvas.width, -this.width / 2, this.width / 2);
        const mapY = createMapper(0, canvas.height, this.height / 2, -this.height / 2);
        return [mapX(x), mapY(y)];
    }

    get width() {
        return this._scale * this._aspectRatio;
    }

    get height() {
        return this._scale;
    }
}

export default Camera;
