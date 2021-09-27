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
        verifyBmpFile(buffer);
        // Previous function would have thrown an error if the file were
        // invalid, the next function call should be safe
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

        const blueChannelBytes = new Uint8Array(image.blueChannel);
        const greenChannelBytes = new Uint8Array(image.greenChannel);
        const redChannelBytes = new Uint8Array(image.redChannel);

        const HEADER_SIZE = 0x36;
        const BITS_PER_PIXEL = 24;
        const BYTES_PER_PIXEL = BITS_PER_PIXEL / 8;

        // Write all the image data to the image
        for (let y = 0; y < height; y++) {
            // Writing the pixels as 24-bit BGR

            // Note that since all the bytes are zero by default, all the
            // padding should work itself out

            // The BMP file format requires that y be positive in the up
            // direction, whereas our `Image` interface requires that it be
            // positive in the "down" direction
            const yUpPositive = height - 1 - y;

            for (let x = 0; x < width; x++) {
                const px =
                    HEADER_SIZE +
                    bytesPerRow * yUpPositive +
                    BYTES_PER_PIXEL * x;
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
 * Contains a list of relative addresses for data in the bitmap file header.
 * These are also absolute addresses, as this is guaranteed to start at byte 0
 * in a BMP file.
 */
const enum BitmapFileHeaderAddress {
    /** In this bitmap implementation, must be "BM". */
    SIGNATURE = 0x00,
    /** The size of this bitmap file. */
    FILE_SIZE = 0x02,
    /** The offset of the image data in this file. */
    IMAGE_DATA_OFFSET = 0x0a,
    /**
     * The address of the dib header.
     *
     * This is not necessarily defined by the spec itself, but by my observation
     * that the file header has size of exactly 0x0e, and the dib header comes
     * immediately after the file header.
     */
    DIB_HEADER = 0x0e,
}

/**
 * Sizes of all the data in the bitmap file header, in bytes.
 */
const enum BitmapFileHeaderSize {
    /** In this bitmap implementation, must be "BM". */
    SIGNATURE = 2,
    /** The size of this bitmap file. */
    FILE_SIZE = 4,
    /** The offset of the image data in this file. */
    IMAGE_DATA_OFFSET = 4,
}

/**
 * Contains a list of relative addresses for data inside the BITMAPINFOHEADER.
 *
 * If only this were written in C with its beautiful structs and pointer
 * arithmetic...
 */
const enum BitmapInfoHeaderAddress {
    /** The size of this header. Must have value 0x28. */
    SIZE = 0x00,
    /** The width of the image, in pixels. */
    WIDTH = 0x04,
    /** The height of the image, in pixels. */
    HEIGHT = 0x08,
    /** Not sure what txhis is the for, but the spec said the value "must be 1". */
    COLOR_PLANES = 0x0c,
    /** Bpp of this image. */
    BITS_PER_PIXEL = 0x0e,
    /**
     * An enum of the possible compression methods as defined by the spec (only
     * BI_RGB supported here).
     *
     * @see {BitmapCompressionMethod}
     */
    COMPRESSION_METHOD = 0x10,
}

/**
 * Size of all the members in the BITMAPINFOHEADER structure, in bytes.
 */
const enum BitmapInfoHeaderSize {
    /** The size of this header. Must have value 0x28. */
    SIZE = 4,
    /** The width of the image, in pixels. */
    WIDTH = 4,
    /** The height of the image, in pixels. */
    HEIGHT = 4,
    /** Not sure what txhis is the for, but the spec said the value "must be 1". */
    COLOR_PLANES = 2,
    /** Bpp of this image. */
    BITS_PER_PIXEL = 2,
    /**
     * An enum of the possible compression methods as defined by the spec (only
     * BI_RGB supported here).
     *
     * @see {BitmapCompressionMethod}
     */
    COMPRESSION_METHOD = 4,
}

/**
 * Possible compression methods and their enum values as defined by the BMP
 * spec.
 */
const enum BitmapCompressionMethod {
    /** Only supported compression method. */
    BI_RGB = 0,
    /** Not supported. */
    BI_RLE8 = 1,
    /** Not supported. */
    BI_RLE4 = 2,
    /** Not supported. */
    BI_BITFIELDS = 3,
    /** Not supported. */
    BI_JPEG = 4,
    /** Not supported. */
    BI_PNG = 5,
    /** Not supported. */
    BI_ALPHABITFIELDS = 6,
    /** Not supported. */
    BI_CMYK = 11,
    /** Not supported. */
    BI_CMYKRLE8 = 12,
    /** Not supported. */
    BI_CMYKRLE4 = 13,
}

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
 * @param byteArray The array of bytes to which to write.
 * @param value     The number value to be written.
 * @param offset    The exact byte at which to start writing.
 * @param numBytes  The number of bytes to write to the array.
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
 * Reads in an integer from a a specified number of bytes from a `Uint8Array`.
 *
 * @param byteArray The array of bytes to read from.
 * @param offset    The index at which to start reading.
 * @param numBytes  The amount of bytes to read.
 * @returns         The integer result of the concatenated bytes.
 */
const readLittleEndianBytes = (
    byteArray: Uint8Array,
    offset: number,
    numBytes: number
) => {
    let read = 0;
    for (let i = offset; i < offset + numBytes; i++) {
        read |= byteArray[i] << (8 * (i - offset));
    }
    return read;
};

/**
 * Verifies a BMP file, whose data is represented as a buffer, and returns if
 * the file was valid.
 *
 * Assumes that the `ArrayBuffer` contains _all_ the file data, and that it
 * _only_ contains the file data.
 *
 * @throws {Error} If the given file is either not supported or invalid.
 */
const verifyBmpFile = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);

    if (!bytes.length) {
        throw new Error('Cannot read an empty BMP file');
    }

    const COMBINED_HEADER_SIZE = 0x36;

    if (bytes.length < COMBINED_HEADER_SIZE) {
        throw new Error(
            'Malformed BMP file: not enough information to store the file headers'
        );
    }

    const signature = readLittleEndianBytes(
        bytes,
        BitmapFileHeaderAddress.SIGNATURE,
        BitmapFileHeaderSize.SIGNATURE
    );

    // If we don't see the "BM" characters, it doesn't have the signature we
    // recognise
    if (signature !== 0x4d42) {
        throw new Error('The given file does not have the BMP file signature');
    }

    const statedFileLength = readLittleEndianBytes(
        bytes,
        BitmapFileHeaderAddress.FILE_SIZE,
        BitmapFileHeaderSize.FILE_SIZE
    );

    if (statedFileLength !== buffer.byteLength) {
        throw new Error('The BMP file does not state its own size correctly');
    }

    const statedImageDataOffset = readLittleEndianBytes(
        bytes,
        BitmapFileHeaderAddress.IMAGE_DATA_OFFSET,
        BitmapFileHeaderSize.IMAGE_DATA_OFFSET
    );

    // Note that this is specifically tied to the implementation detail that
    // BITMAPINFOHEADER is the header of choice

    if (statedImageDataOffset < COMBINED_HEADER_SIZE) {
        throw new Error(
            'Image data for BMP must start at at least 0x36 to store the headers'
        );
    }

    // It makes a bit more sense to BITMAPINFOHEADER as a struct of its own with
    // relative addresses than as an absolute location in a bitmap file, even
    // though that's how it's implemented according to the spec
    const DIB_HEADER = BitmapFileHeaderAddress.DIB_HEADER;

    const bitsPerPixel = readLittleEndianBytes(
        bytes,
        DIB_HEADER + BitmapInfoHeaderAddress.BITS_PER_PIXEL,
        BitmapInfoHeaderSize.BITS_PER_PIXEL
    );

    if (bitsPerPixel !== 24) {
        throw new Error(
            'Only 24 bits per pixel (bpp) is supported for BMP files'
        );
    }

    const compressionMethod = readLittleEndianBytes(
        bytes,
        DIB_HEADER + BitmapInfoHeaderAddress.COMPRESSION_METHOD,
        BitmapInfoHeaderSize.COMPRESSION_METHOD
    );

    if (compressionMethod !== BitmapCompressionMethod.BI_RGB) {
        throw new Error('Only BI_RGB compression is supported for BMP files');
    }

    // This is not 100% correct, and is likely to fail in the future. In all the
    // implementations we've been using so far, the image data ends when the
    // file does, but according to the spec, this is not always the case. If and
    // when this is fix, it should only involve changing `bytes.length` to
    // whatever the end of the image is meant to be
    const statedImageDataSize = bytes.length - statedImageDataOffset;
    const statedWidth = readLittleEndianBytes(
        bytes,
        DIB_HEADER + BitmapInfoHeaderAddress.WIDTH,
        BitmapInfoHeaderSize.WIDTH
    );
    const statedHeight = readLittleEndianBytes(
        bytes,
        DIB_HEADER + BitmapInfoHeaderAddress.HEIGHT,
        BitmapInfoHeaderSize.HEIGHT
    );

    const expectedImageDataSize = getImageDataSizeInBytes(
        statedWidth,
        statedHeight
    );

    if (expectedImageDataSize !== statedImageDataSize) {
        throw new Error(
            'The stated image data size differs from the expected size for this BMP implementation'
        );
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

    const DIB_HEADER = BitmapFileHeaderAddress.DIB_HEADER;

    const width = readLittleEndianBytes(
        bytes,
        DIB_HEADER + BitmapInfoHeaderAddress.WIDTH,
        BitmapInfoHeaderSize.WIDTH
    );
    const height = readLittleEndianBytes(
        bytes,
        DIB_HEADER + BitmapInfoHeaderAddress.HEIGHT,
        BitmapInfoHeaderSize.HEIGHT
    );

    const imageDataStart = readLittleEndianBytes(
        bytes,
        BitmapFileHeaderAddress.IMAGE_DATA_OFFSET,
        BitmapFileHeaderSize.IMAGE_DATA_OFFSET
    );

    const numBytesPerRow = getNumBytesPerRow(width, height);

    const redChannel = new Uint8Array(width * height);
    const greenChannel = new Uint8Array(width * height);
    const blueChannel = new Uint8Array(width * height);

    // Iterate y first so the pixels are accessed sequentially; it makes
    // debugging easier
    for (let y = 0; y < height; y++) {
        // The BMP file format requires that y be positive in the up
        // direction, whereas our `Image` interface requires that it be
        // positive in the "down" direction
        const yUpPositive = height - 1 - y;

        for (let x = 0; x < width; x++) {
            // Read the pixel from y-positive = down
            const px = imageDataStart + numBytesPerRow * yUpPositive + 3 * x;
            // And write it as y-positive = up
            blueChannel[y * width + x] = bytes[px + 0];
            greenChannel[y * width + x] = bytes[px + 1];
            redChannel[y * width + x] = bytes[px + 2];
        }
    }

    // Let's make alphaChannel a Uin8Array of the correct size with all ones
    // written to it

    const alphaChannel = new Uint8Array(width * height).fill(0xff);

    return {
        width,
        height,
        redChannel,
        greenChannel,
        blueChannel,
        alphaChannel,
    };
};
