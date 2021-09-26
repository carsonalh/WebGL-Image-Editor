/**
 * Represents an abstract image that can be read from or written to.
 */
export interface Image {
    /** The width of the image in pixels. */
    width: number;
    /** The height of the image in pixels. */
    height: number;
    /** The red channel of the image. */
    redChannel: ArrayBuffer;
    /** The green channel of the image. */
    greenChannel: ArrayBuffer;
    /** The blue channel of the image. */
    blueChannel: ArrayBuffer;
    /** The alpha channel of the image. */
    alphaChannel: ArrayBuffer;
}

/**
 * Function that reads an image from an encoded buffer.
 *
 * @throws {Error} If the buffer data is not correctly encoded.
 */
export type ImageReadFunction<T extends Image = Image> = (
    buffer: ArrayBuffer
) => T;

/**
 * Function that writes image data to an encoded buffer.
 *
 * @throws {Error} If the abstract image is missing any information.
 */
export type ImageWriteFunction<T extends Image = Image> = (
    image: Readonly<T>
) => ArrayBuffer;

/**
 * Interface that is able to encode and decode an image.
 */
export interface ImageSerializer<R extends Image = Image, W extends Image = R> {
    /**
     * Function that decodes an image from an `ArrayBuffer` and writes it to an
     * `Image`.
     */
    read: ImageReadFunction<R>;
    /**
     * Function that encodes an image and writes it to an `ArrayBuffer`.
     */
    write: ImageWriteFunction<W>;
}
