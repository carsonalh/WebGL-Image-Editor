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
}

export default Camera;
