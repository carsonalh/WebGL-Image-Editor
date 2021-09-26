import { Image, ImageSerializer } from './image';

/**
 * Interface that stores particular information about BMP images.
 */
export interface BmpImage extends Image {}

/**
 * Serializer interface for the BMP file type.
 *
 * Note that at this point, only a subset of the filetype has been implemented.
 * Take extra caution of this, especially when using the `read` function, as it
 * is likely to throw an error if it does not support a feature described in the
 * file.
 */
interface BmpImageSerializer extends ImageSerializer<BmpImage> {
    /**
     * Reads an encoded BMP file into a `BmpImage` object.
     *
     * Note that this function only supports a specific subset of BMP files, and
     * will not work for many different encoding choices. If it finds that the
     * provided file type is not supported, it will throw an `Error`.
     */
    read: ImageSerializer<BmpImage>['read'];
    /**
     * Writes the image data from the provided `BmpImage` into a new
     * `ArrayBuffer`.
     *
     * @returns The `ArrayBuffer` with the encoded image data.
     */
    write: ImageSerializer<BmpImage>['write'];
    /**
     * Convenience function to create a `BmpImage` with sensible defaults.
     *
     * If only `width` and `height` are given, a black image is created with
     * those dimensions. If one or both of `width` and `height` are not given,
     * the property in question will default to `0`.
     */
    create(options?: Partial<BmpImage>): BmpImage;
}

const Bmp: BmpImageSerializer = {
    read: buffer => {
        const bytes = new Uint8Array(buffer);

        if (!buffer.byteLength) {
            throw new Error('Cannot read an empty BMP file');
        }

        const COMBINED_HEADER_SIZE = 0x36;

        if (buffer.byteLength < COMBINED_HEADER_SIZE) {
            throw new Error(
                'Malformed BMP file: not enough information to store the file headers'
            );
        }

        const firstTwoBytes = (bytes[0x01] << 8) | (bytes[0x00] << 0);

        // If we don't see the 'BM' characters, it doesn't have the signature we recognise
        if (firstTwoBytes !== 0x4d42) {
            throw new Error(
                'The given file does not have the BMP file signature'
            );
        }

        const statedFileLength =
            (bytes[0x02] << (8 * 0)) |
            (bytes[0x03] << (8 * 1)) |
            (bytes[0x04] << (8 * 2)) |
            (bytes[0x05] << (8 * 3));

        if (statedFileLength !== bytes.length) {
            throw new Error(
                'The BMP file does not state its own size correctly'
            );
        }

        const statedImageDataOffset =
            (bytes[0x0a] << (8 * 0)) |
            (bytes[0x0b] << (8 * 1)) |
            (bytes[0x0c] << (8 * 2)) |
            (bytes[0x0d] << (8 * 3));

        const ONLY_SUPPORTED_COMBINED_HEADER_SIZE = 0x36;

        if (statedImageDataOffset !== ONLY_SUPPORTED_COMBINED_HEADER_SIZE) {
            throw new Error(
                'Image data for BMP must start at byte 0x36; nothing else is supported'
            );
        }

        const bitsPerPixel =
            (bytes[0x1c] << (8 * 0)) | (bytes[0x1d] << (8 * 1));

        if (bitsPerPixel !== 24) {
            throw new Error(
                'Only 24 bits per pixel (bpp) is supported for BMP files'
            );
        }

        const compressionMethod =
            (bytes[0x1e] << (8 * 0)) | (bytes[0x1f] << (8 * 1));

        const BI_RGB = 0;

        if (compressionMethod !== BI_RGB) {
            throw new Error(
                'Only BI_RGB compression is supported for BMP files'
            );
        }

        const statedImageDataSize = bytes.length - COMBINED_HEADER_SIZE;
        const statedWidth =
            (bytes[0x12] << (0 * 8)) |
            (bytes[0x13] << (1 * 8)) |
            (bytes[0x14] << (2 * 8)) |
            (bytes[0x15] << (3 * 8));
        const statedHeight =
            (bytes[0x16] << (0 * 8)) |
            (bytes[0x17] << (1 * 8)) |
            (bytes[0x18] << (2 * 8)) |
            (bytes[0x19] << (3 * 8));

        const expectedImageDataSize = getImageDataSizeInBytes(
            statedWidth,
            statedHeight
        );

        if (expectedImageDataSize !== statedImageDataSize) {
            throw new Error(
                'The stated image data size differs from the expected size for this BMP implementation'
            );
        }

        return parseVerifiedBmpFile(buffer);
    },
    write: image => {
        const { width, height } = image;
        const imageDataSizeInBytes = getImageDataSizeInBytes(width, height);
        const buffer = new ArrayBuffer(0x36 + imageDataSizeInBytes);
        const byteArray = new Uint8Array(buffer);

        // WRITE THE FILE HEADER
        // Write BM to the first 2 bytes of the file header
        byteArray[0x00] = 0x42;
        byteArray[0x01] = 0x4d;
        // Write the size of the entire file to the file header
        writeLittleEndianBytes(byteArray, buffer.byteLength, 0x02, 4);
        // Write the address of the beginning of the image data, which happens
        // to be the size of the header because there is no extra metadata (like
        // colour palettes) being stored
        writeLittleEndianBytes(byteArray, 0x36, 0x0a, 4);

        // WRITE THE DIB HEADER (BITMAPINFOHEADER)
        // Write 40 decimal (0x28) (the size of the dib header) to the start of the dib header
        writeLittleEndianBytes(byteArray, 0x28, 0x0e, 4);
        // Write the width and height to 0x12 and 0x14 of the image data (16-bit unsigned, each)
        writeLittleEndianBytes(byteArray, width, 0x12, 4);
        writeLittleEndianBytes(byteArray, height, 0x16, 4);
        // Write the number of color planes (16-bit unsigned; must be 1)
        writeLittleEndianBytes(byteArray, 1, 0x1a, 2);
        // Write the number of bits per pixel (24bpp) (16-bit unsigned)
        writeLittleEndianBytes(byteArray, 24, 0x1c, 2);

        const bytesPerRow = getNumBytesPerRow(width, height);
        const HEADER_SIZE = 0x36;

        const blueChannelBytes = new Uint8Array(image.blueChannel);
        const greenChannelBytes = new Uint8Array(image.greenChannel);
        const redChannelBytes = new Uint8Array(image.redChannel);

        // Write all the image data to the image
        for (let y = 0; y < height; y++) {
            // Writing the pixels as 24-bit BGR

            // Note that since all the bytes are zero by default, all the
            // padding should work itself out

            for (let x = 0; x < width; x++) {
                const BITS_PER_PIXEL = 24;
                const BYTES_PER_PIXEL = BITS_PER_PIXEL / 8;
                const px = HEADER_SIZE + bytesPerRow * y + BYTES_PER_PIXEL * x;
                byteArray[px + 0] = blueChannelBytes[y * width + x];
                byteArray[px + 1] = greenChannelBytes[y * width + x];
                byteArray[px + 2] = redChannelBytes[y * width + x];
            }
        }

        return buffer;
    },
    create: (options?) => {
        const width = options?.width || 0;
        const height = options?.height || 0;
        const defaultOptions: BmpImage = {
            width,
            height,
            redChannel: new ArrayBuffer(width * height),
            greenChannel: new ArrayBuffer(width * height),
            blueChannel: new ArrayBuffer(width * height),
            alphaChannel: new ArrayBuffer(width * height),
        };

        if (!options) {
            return defaultOptions;
        }

        return { ...defaultOptions, ...options };
    },
};

export { Bmp };

export default Bmp;

/**
 * Gets the number of bytes a single row in the image occupies, including its
 * padding.
 *
 * @param width Width of the image in pixels.
 */
const getNumBytesPerRow = (width: number, height: number) => {
    const bytesPerPixel = 3; // 24-bit color
    const numUnpaddedBytesPerRow = bytesPerPixel * width;
    const numPaddedBytesPerRow = 4 * Math.ceil(numUnpaddedBytesPerRow / 4);
    return numPaddedBytesPerRow;
};

/**
 * Gets the size of the image data (in bytes) as it is to be stored in the BMP
 * file format.
 *
 * @param width     Width of the image in pixels.
 * @param height    Height of the image in pixels.
 */
const getImageDataSizeInBytes = (width: number, height: number) => {
    const numTotalBytes = getNumBytesPerRow(width, height) * height;
    return numTotalBytes;
};

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
const writeLittleEndianBytes = (
    byteArray: Uint8Array,
    value: number,
    offset: number,
    numBytes: number
) => {
    for (let i = offset; i < offset + numBytes; i++) {
        byteArray[i] = value & 0xff;
        value >>= 8;
    }
};

/**
 * Parses a BMP file that has been verified to:
 *
 * 1. Be supported, and
 * 2. Have consistent and correct data, according to the file spec.
 *
 * If these conditions are not met, this function can and will break in
 * unexpected ways and probably won't give the intended resulting object.
 *
 * @param verifiedBmpData   A BMP file that has already had all the necessary
 *                          sanity checks performed on it.
 */
const parseVerifiedBmpFile = (verifiedBmpData: ArrayBuffer): BmpImage => {
    // Start by getting the offset of the image data in bytes
    const bytes = new Uint8Array(verifiedBmpData);
    const width =
        (bytes[0x12] << (8 * 0)) |
        (bytes[0x13] << (8 * 1)) |
        (bytes[0x14] << (8 * 2)) |
        (bytes[0x15] << (8 * 3));
    const height =
        (bytes[0x16] << (8 * 0)) |
        (bytes[0x17] << (8 * 1)) |
        (bytes[0x18] << (8 * 2)) |
        (bytes[0x19] << (8 * 3));

    const IMAGE_DATA_START = 0x36;

    const numBytesPerRow = getNumBytesPerRow(width, height);

    const redChannel = new Uint8Array(width * height);
    const greenChannel = new Uint8Array(width * height);
    const blueChannel = new Uint8Array(width * height);

    // Iterate y first so the pixels are accessed sequentially; it makes
    // debugging easier
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const px = IMAGE_DATA_START + numBytesPerRow * y + 3 * x;
            blueChannel[y * width + x] = bytes[px + 0];
            greenChannel[y * width + x] = bytes[px + 1];
            redChannel[y * width + x] = bytes[px + 2];
        }
    }

    return {
        width,
        height,
        redChannel,
        greenChannel,
        blueChannel,
        alphaChannel: null,
    };
};
