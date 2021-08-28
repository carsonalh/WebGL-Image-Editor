class Sprite {
    constructor(width, height) {
        this._width = width;
        this._height = height;
        /** A row-major array of the 32-bit RGBA image data being stored. */
        this._buffer = new Uint8Array(4 * this._width * this._height);
    }

    /** The sprite's width, in px. */
    get width() {
        return this._width;
    }
    
    /** The sprite's height, in px. */
    get height() {
        return this._height;
    }

    /** An ArrayBuffer containing the image data. Use at own risk. */
    get buffer() {
        return this._buffer;
    }

    getPixel([x, y]) {
        const pxOffset = y * this.width + x;
        // 4 bytes to a pixel
        const bufOffset = 4 * pxOffset;
        
        const r = this._buffer[bufOffset + 0];
        const g = this._buffer[bufOffset + 1];
        const b = this._buffer[bufOffset + 2];
        const a = this._buffer[bufOffset + 3];
        
        return [r, g, b, a];
    }
    
    setPixel([x, y], [r, g, b, a]) {
        const pxOffset = y * this.width + x;
        // 4 bytes to a pixel
        const bufOffset = 4 * pxOffset;
        
        this._buffer[bufOffset + 0] = r;
        this._buffer[bufOffset + 1] = g;
        this._buffer[bufOffset + 2] = b;
        this._buffer[bufOffset + 3] = a;
    }
}

export default Sprite;
