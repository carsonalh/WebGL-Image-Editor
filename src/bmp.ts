export interface BmpOptions {
    /** The width of the image (default 0) */
    width?: number;
    /** The height of the image (default 0) */
    height?: number;
}

/**
 * Manages converting image data to the BMP file format.
 */
class Bmp {
    static create(options?: BmpOptions) {
        return new Bmp(options);
    }

    private _width: number;
    private _height: number;

    private constructor(options?: BmpOptions) {
        const defaultOptions = <BmpOptions>{
            width: 0,
            height: 0,
        };

        // Create a copy of the options with a default for options that are not
        // provided using `Bmp.defaultOptions`
        const _options = Object.assign({}, options);
        Object.setPrototypeOf(_options, defaultOptions);

        this._width = _options.width;
        this._height = _options.height;
    }

    /**
     * Immutable method to get the data in this image as an `ArrayBuffer`.
     * @returns A copy of this Bmp's data in the BMP format.
     */
    public toBuffer() {
        const imageDataSizeInBytes = this.getImageDataSizeInBytes();
        const buffer = new ArrayBuffer(0x20 + imageDataSizeInBytes);
        const byteArray = new Uint8Array(buffer);
        // WRITE THE FILE HEADER
        // Write BM to the first 2 bytes of the file header
        byteArray[0x00] = 0x42;
        byteArray[0x01] = 0x4d;
        // Write the size of the entire file to the file header
        byteArray[0x02] = 0x20 + imageDataSizeInBytes; // TODO: Assuming 0x00 <= imageDataSizeInBytes <= 0xDF
        byteArray[0x03] = 0x00;
        byteArray[0x04] = 0x00;
        byteArray[0x05] = 0x00;
        // WRITE THE DIB HEADER
        // Write 12 decimal (0C hex) (the size of the dib header) to the dib header
        byteArray[0x0e] = 0x0c;
        byteArray[0x0f] = 0x00;
        byteArray[0x10] = 0x00;
        byteArray[0x11] = 0x00;
        // Write the width of the image data (16-bit unsigned)
        byteArray[0x12] = this._width; // TODO: Assuming 0 <= this._width <= 0xFF
        byteArray[0x13] = 0x00;
        // Write the height of the image data (16-bit unsigned)
        byteArray[0x14] = this._height; // TODO: Assuming 0 <= this._height <= 0xFF
        byteArray[0x15] = 0x00;
        // Write the number of color planes (16-bit unsigned; must be 1)
        byteArray[0x16] = 0x01;
        byteArray[0x17] = 0x00;
        // Write the number of bits per pixel (16-bit unsigned)
        // 24 bits per pixel
        byteArray[0x18] = 0x18;
        byteArray[0x19] = 0x00;
        return buffer;
    }

    /**
     * Gets the size of the image data (in bytes) as it is to be stored in the
     * BMP file format.
     */
    private getImageDataSizeInBytes() {
        const bytesPerPixel = 3; // 24-bit color
        const numUnpaddedBytesPerRow = bytesPerPixel * this._width;
        const numPaddedBytesPerRow = 4 * Math.ceil(numUnpaddedBytesPerRow / 4);
        const numTotalBytes = numPaddedBytesPerRow * this._height;
        return numTotalBytes;
    }
}

export { Bmp };
