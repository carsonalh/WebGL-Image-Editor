export interface BmpOptions {
    /** The width of the image (default 0) */
    width?: number;
    /** The height of the image (default 0) */
    height?: number;
    /** The red channel; row major; y-positive; must be length width * height or greater */
    redChannel?: Uint8Array;
    /** The blue channel; row major; y-positive; must be length width * height or greater */
    blueChannel?: Uint8Array;
    /** The green channel; row major; y-positive; must be length width * height or greater */
    greenChannel?: Uint8Array;
}

/**
 * Manages converting image data to the BMP file format.
 */
class Bmp {
    public static create(options?: BmpOptions) {
        return new Bmp(options);
    }

    /**
     * Writes an amount of bytes from a given number value to a Uint8Array.
     *
     * Note that if a number that does not fit into the amount of bytes is
     * provided, it will be cut off at the given amount of bytes. Also note that
     * this has NO SUPPORT for negative numbers.
     *
     * @param byteArray The array of bytes to which to write
     * @param value     The number value to be written
     * @param offset    The exact byte at which to start writing
     * @param numBytes  The number of bytes to write to the array
     */
    private static writeLittleEndianBytes(
        byteArray: Uint8Array,
        value: number,
        offset: number,
        numBytes: number
    ) {
        for (let i = offset; i < offset + numBytes; i++) {
            byteArray[i] = value & 0xff;
            value >>= 8;
        }
    }

    private _width: number;
    private _height: number;
    private _redChannel: Uint8Array;
    private _blueChannel: Uint8Array;
    private _greenChannel: Uint8Array;

    /** The width of the image, in pixels */
    public get width() {
        return this._width;
    }

    /** The height of the image, in pixels */
    public get height() {
        return this._height;
    }

    private constructor(options?: BmpOptions) {
        const numPixels =
            options?.width !== undefined && options?.height !== undefined
                ? options.width * options.height
                : 0;

        const defaultOptions = <BmpOptions>{
            width: 0,
            height: 0,
            redChannel: new Uint8Array(numPixels),
            greenChannel: new Uint8Array(numPixels),
            blueChannel: new Uint8Array(numPixels),
        };

        // Create a copy of the options with a default for options that are not
        // provided using `Bmp.defaultOptions`
        const _options = Object.assign({}, options);
        Object.setPrototypeOf(_options, defaultOptions);

        this._width = _options.width;
        this._height = _options.height;
        this._redChannel = _options.redChannel;
        this._greenChannel = _options.greenChannel;
        this._blueChannel = _options.blueChannel;
    }

    /**
     * Immutable method to get the data in this image as an `ArrayBuffer`.
     * @returns A copy of this Bmp's data in the BMP format.
     */
    public toBuffer() {
        const imageDataSizeInBytes = this.getImageDataSizeInBytes();
        const buffer = new ArrayBuffer(0x36 + imageDataSizeInBytes);
        const byteArray = new Uint8Array(buffer);

        // WRITE THE FILE HEADER
        // Write BM to the first 2 bytes of the file header
        byteArray[0x00] = 0x42;
        byteArray[0x01] = 0x4d;
        // Write the size of the entire file to the file header
        Bmp.writeLittleEndianBytes(byteArray, buffer.byteLength, 0x02, 4);

        // WRITE THE DIB HEADER
        // Write 40 decimal (0x28) (the size of the dib header) to the start of the dib header
        Bmp.writeLittleEndianBytes(byteArray, 0x28, 0x0e, 4);
        // Write the width and height to 0x12 and 0x14 of the image data (16-bit unsigned, each)
        Bmp.writeLittleEndianBytes(byteArray, this._width, 0x12, 4);
        Bmp.writeLittleEndianBytes(byteArray, this._height, 0x16, 4);
        // Write the number of color planes (16-bit unsigned; must be 1)
        Bmp.writeLittleEndianBytes(byteArray, 1, 0x1a, 2);
        // Write the number of bits per pixel (24bpp) (16-bit unsigned)
        Bmp.writeLittleEndianBytes(byteArray, 24, 0x1c, 2);

        const bytesPerRow = this.getNumBytesPerRow();
        const HEADER_SIZE = 0x36;

        // Write all the image data to the image
        for (let y = 0; y < this.height; y++) {
            // Writing the pixels as 24-bit BGR

            // Note that since all the bytes are zero by default, all the
            // padding should work itself out

            for (let x = 0; x < this.width; x++) {
                // TODO: make this at least _a little_ more intelligible
                const px = bytesPerRow * y + 3 * x;
                const blue = this._blueChannel[y * this._width + x];
                const green = this._greenChannel[y * this._width + x];
                const red = this._redChannel[y * this._width + x];
                byteArray[HEADER_SIZE + px + 0] = blue;
                byteArray[HEADER_SIZE + px + 1] = green;
                byteArray[HEADER_SIZE + px + 2] = red;
            }
        }

        return buffer;
    }

    /**
     * Gets the size of the image data (in bytes) as it is to be stored in the
     * BMP file format.
     */
    private getImageDataSizeInBytes() {
        const numTotalBytes = this.getNumBytesPerRow() * this._height;
        return numTotalBytes;
    }

    /**
     * Gets the number of bytes a single row in the image occupies, including
     * its padding.
     */
    private getNumBytesPerRow() {
        const bytesPerPixel = 3; // 24-bit color
        const numUnpaddedBytesPerRow = bytesPerPixel * this._width;
        const numPaddedBytesPerRow = 4 * Math.ceil(numUnpaddedBytesPerRow / 4);
        return numPaddedBytesPerRow;
    }
}

export { Bmp };
