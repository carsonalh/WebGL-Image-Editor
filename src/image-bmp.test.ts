import { Bmp, BmpImage } from './image-bmp';

describe('write', () => {
    describe('bmp with default options', () => {
        const WIDTH = 0,
            HEIGHT = 0;

        const bmp: BmpImage = {
            width: WIDTH,
            height: HEIGHT,
            redChannel: new Uint8Array(WIDTH * HEIGHT).buffer,
            greenChannel: new Uint8Array(WIDTH * HEIGHT).buffer,
            blueChannel: new Uint8Array(WIDTH * HEIGHT).buffer,
            alphaChannel: new Uint8Array(WIDTH * HEIGHT).buffer,
        };
        const buffer = Bmp.write(bmp);
        const byteArray = new Uint8Array(buffer);

        it('creates an array large enough for the file header and the DIB header', () => {
            // NOTE: using BITMAPINFOHEADER as header standard
            expect(buffer.byteLength).toBeGreaterThanOrEqual(0x36);
        });

        it('writes BM to the start of the file', () => {
            // Spells out 'BM' in ASCII
            expect(byteArray[0]).toEqual(0x42);
            expect(byteArray[1]).toEqual(0x4d);
        });

        it('writes decimal 40 to the first 4 bytes of the DIB header (starting at 0x0E)', () => {
            // decimal 40 is 0x28
            expect(byteArray[0x0e]).toEqual(0x28);
            expect(byteArray[0x0f]).toEqual(0x00);
            expect(byteArray[0x10]).toEqual(0x00);
            expect(byteArray[0x11]).toEqual(0x00);
        });

        it('writes 1 as the number of color planes at offset 0x1A', () => {
            expect(byteArray[0x1a]).toEqual(0x01);
            expect(byteArray[0x1b]).toEqual(0x00);
        });

        it('writes 0 as the width and height in the DIB header', () => {
            // width
            expect(byteArray[0x12]).toEqual(0x00);
            expect(byteArray[0x13]).toEqual(0x00);
            // height
            expect(byteArray[0x14]).toEqual(0x00);
            expect(byteArray[0x15]).toEqual(0x00);
        });

        it('uses 24 bits per pixel by default', () => {
            expect(byteArray[0x1c]).toEqual(0x18); // 24 in decimal
            expect(byteArray[0x1d]).toEqual(0x00);
        });

        it('stores no data for an image with zero width and zero height', () => {
            expect(byteArray.length).toEqual(0x36);
        });

        it('stores the size of the whole file in the file header', () => {
            expect(byteArray[0x02]).toEqual(0x36);
            expect(byteArray[0x03]).toEqual(0x00);
            expect(byteArray[0x04]).toEqual(0x00);
            expect(byteArray[0x05]).toEqual(0x00);
        });

        it('should use BI_RGB compression by default', () => {
            // BI_RGB is represented as 0
            expect(byteArray[0x1e]).toEqual(0x00);
            expect(byteArray[0x1f]).toEqual(0x00);
            expect(byteArray[0x20]).toEqual(0x00);
            expect(byteArray[0x21]).toEqual(0x00);
        });

        it('writes 0x36 as the starting address of the image data', () => {
            // All that is supported, in terms of headers is BITMAPINFOHEADER
            // with no extra data; hence this 4-byte field must equal 0x36
            expect(byteArray[0x0a]).toEqual(0x36);
            expect(byteArray[0x0b]).toEqual(0x00);
            expect(byteArray[0x0c]).toEqual(0x00);
            expect(byteArray[0x0d]).toEqual(0x00);
        });
    });

    describe('bmp image of size 2x2', () => {
        const bmp = Bmp.create({
            width: 2,
            height: 2,
        });
        const buffer = Bmp.write(bmp);
        const byteArray = new Uint8Array(buffer);

        it('pads 6 bytes of color data to 8 (4 byte alignment per row)', () => {
            // There should be 16 bytes of image data, as there are 2 rows
            expect(byteArray[0x02]).toEqual(0x46);
            expect(byteArray[0x03]).toEqual(0x00);
            expect(byteArray[0x04]).toEqual(0x00);
            expect(byteArray[0x05]).toEqual(0x00);
        });

        it('creates buffer of size 0x46 (0x36 header + 0x10 in image data)', () => {
            expect(buffer.byteLength).toEqual(0x46);
        });
    });

    describe('bmp image of size 0x100 x 0x100', () => {
        const bmp = Bmp.create({
            width: 0x100,
            height: 0x100,
        });
        const buffer = Bmp.write(bmp);
        const byteArray = new Uint8Array(buffer);

        it('can store the width and height in the DIB header', () => {
            // width
            expect(byteArray[0x12]).toEqual(0x00);
            expect(byteArray[0x13]).toEqual(0x01);
            expect(byteArray[0x14]).toEqual(0x00);
            expect(byteArray[0x15]).toEqual(0x00);
            // height
            expect(byteArray[0x16]).toEqual(0x00);
            expect(byteArray[0x17]).toEqual(0x01);
            expect(byteArray[0x18]).toEqual(0x00);
            expect(byteArray[0x19]).toEqual(0x00);
        });

        it('should have a size of exactly 0x36 + 3 * (0x100)^2 as 0x100 is divisible by 4', () => {
            const bytesPerRow = 3 * 0x100;
            expect(buffer.byteLength).toEqual(0x36 + bytesPerRow * 0x100);
        });

        it('should write the exact size in metadata (location 0x02 for 4 bytes)', () => {
            // Expecting the 4-byte value (0x)00 03 00 36
            expect(byteArray[0x02]).toEqual(0x36);
            expect(byteArray[0x03]).toEqual(0x00);
            expect(byteArray[0x04]).toEqual(0x03);
            expect(byteArray[0x05]).toEqual(0x00);
        });
    });

    describe('2x2 image from wikipedia example https://en.wikipedia.org/wiki/BMP_file_format#Example_1', () => {
        const bmp = Bmp.create({
            width: 2,
            height: 2,
            redChannel: new Uint8Array([0x00, 0x00, 0xff, 0xff]).buffer,
            greenChannel: new Uint8Array([0x00, 0xff, 0x00, 0xff]).buffer,
            blueChannel: new Uint8Array([0xff, 0x00, 0x00, 0xff]).buffer,
        });
        const buffer = Bmp.write(bmp);
        const byteArray = new Uint8Array(buffer);

        it('can write the image from wikipedia to bmp', () => {
            // Pixel format should be written as BGR

            // BMP requires row-major as does our `Image` interface, but
            // requires that y = 0 is the bottom-most row of pixels in the
            // image, while ours requires that y = 0 is the top-most row

            // (0, 1)
            expect(byteArray[0x36]).toEqual(0x00);
            expect(byteArray[0x37]).toEqual(0x00);
            expect(byteArray[0x38]).toEqual(0xff);
            // (1, 1)
            expect(byteArray[0x39]).toEqual(0xff);
            expect(byteArray[0x3a]).toEqual(0xff);
            expect(byteArray[0x3b]).toEqual(0xff);
            // Padding for row y = 1
            expect(byteArray[0x3c]).toEqual(0x00);
            expect(byteArray[0x3d]).toEqual(0x00);
            // (0, 0)
            expect(byteArray[0x3e]).toEqual(0xff);
            expect(byteArray[0x3f]).toEqual(0x00);
            expect(byteArray[0x40]).toEqual(0x00);
            // (1, 0)
            expect(byteArray[0x41]).toEqual(0x00);
            expect(byteArray[0x42]).toEqual(0xff);
            expect(byteArray[0x43]).toEqual(0x00);
            // Padding for row y = 0
            expect(byteArray[0x44]).toEqual(0x00);
            expect(byteArray[0x45]).toEqual(0x00);
        });
    });
});

describe('read', () => {
    describe('verify', () => {
        it('throws error for an empty file', () => {
            expect(() => Bmp.read(new ArrayBuffer(0))).toThrowError();
        });

        const goodFile = new Uint8Array(
            Bmp.write(
                Bmp.create({
                    width: 0,
                    height: 0,
                })
            )
        );

        it('does not throw for a good file', () => {
            const bytes = new Uint8Array(goodFile);
            Bmp.read(bytes.buffer);
        });

        it('throws error if size cannot fit BITMAPINFOHEADER', () => {
            const MIN_SIZE = 0x36;
            const bytes = new Uint8Array(MIN_SIZE - 1);
            expect(() => Bmp.read(bytes.buffer)).toThrowError();
        });

        it('throws error if file does not start with BM', () => {
            const bytes = new Uint8Array(goodFile);

            // Erase the BM from the start of the file
            bytes[0x00] = 0x00;
            bytes[0x01] = 0x00;

            expect(() => Bmp.read(bytes.buffer)).toThrowError();
        });

        it('throws error if the file does not state its own length correctly', () => {
            const bytes = new Uint8Array(goodFile);

            // Erase the 4 bytes that state the file's length
            bytes[0x02] = 0x00;
            bytes[0x03] = 0x00;
            bytes[0x04] = 0x00;
            bytes[0x05] = 0x00;

            expect(() => Bmp.read(bytes.buffer)).toThrowError();
        });

        it('throws error if starting address is not directly after header (at address 0x36)', () => {
            const bytes = new Uint8Array(goodFile);

            // Change starting address to say 0x37, one byte after what it should be
            bytes[0x0a] = 0x37;
            bytes[0x0b] = 0x00;
            bytes[0x0c] = 0x00;
            bytes[0x0d] = 0x00;

            expect(() => Bmp.read(bytes.buffer)).toThrowError();
        });

        it('throws error if header is not BITMAPINFOHEADER (size === 40, 0x28)', () => {
            const bytes = new Uint8Array(goodFile);

            // We'll lie about the header and say it's two bytes shorter than what it should be
            bytes[0x0a] = 0x26;
            bytes[0x0b] = 0x00;
            bytes[0x0c] = 0x00;
            bytes[0x0d] = 0x00;

            expect(() => Bmp.read(bytes.buffer)).toThrowError();
        });

        it('throws error if the bits per pixel (bpp) is not 24', () => {
            const bytes = new Uint8Array(goodFile);

            bytes[0x1c] = 0x20; // 32 in decimal
            bytes[0x1d] = 0x00;

            expect(() => Bmp.read(bytes.buffer)).toThrowError();
        });

        it('throws error if the compression method is not BI_RGB (=== 0)', () => {
            const bytes = new Uint8Array(goodFile);

            // set compression method === 1 (BI_RLE8)
            bytes[0x1e] = 0x01;
            bytes[0x1f] = 0x00;
            bytes[0x20] = 0x00;
            bytes[0x21] = 0x00;

            expect(() => Bmp.read(bytes.buffer)).toThrowError();
        });

        it('throws error if there are an incorrect amount of bytes to store the image data', () => {
            // A good buffer with a blank BMP-format image
            const buffer = Bmp.write(Bmp.create({ width: 2, height: 2 }));
            // Copy the good array into this bad one
            const bytes = new Uint8Array(
                buffer.slice(0, buffer.byteLength - 2)
            );
            // Also adjust the length to be accurate
            const newLength = bytes.length;
            bytes[0x02] = newLength; // newLength will surely be <= 0xff
            bytes[0x03] = 0x00;
            bytes[0x04] = 0x00;
            bytes[0x05] = 0x00;

            expect(() => Bmp.read(bytes.buffer)).toThrowError();
        });
    });

    describe('parse', () => {
        it('successfully reads a 1-bytes width and height', () => {
            let buffer = Bmp.write(
                Bmp.create({
                    width: 32,
                    height: 32,
                })
            );

            let parsedBmp = Bmp.read(buffer);

            expect(parsedBmp.width).toEqual(32);
            expect(parsedBmp.height).toEqual(32);

            buffer = Bmp.write(
                Bmp.create({
                    width: 16,
                    height: 16,
                })
            );

            parsedBmp = Bmp.read(buffer);
            expect(parsedBmp.width).toEqual(16);
            expect(parsedBmp.height).toEqual(16);

            buffer = Bmp.write(
                Bmp.create({
                    width: 16,
                    height: 8,
                })
            );

            parsedBmp = Bmp.read(buffer);
            expect(parsedBmp.width).toEqual(16);
            expect(parsedBmp.height).toEqual(8);
        });

        it('successfully reads multi-byte width and height', () => {
            const buffer = Bmp.write(
                Bmp.create({
                    width: 0x200,
                    height: 0x200,
                })
            );

            const parsedBmp = Bmp.read(buffer);

            expect(parsedBmp.width).toEqual(0x200);
            expect(parsedBmp.height).toEqual(0x200);
        });

        it('can read in the 2x2 wikipedia image', () => {
            const buffer = Bmp.write(
                Bmp.create({
                    width: 2,
                    height: 2,
                    redChannel: new Uint8Array([0x00, 0x00, 0xff, 0xff]),
                    greenChannel: new Uint8Array([0x00, 0xff, 0x00, 0xff]),
                    blueChannel: new Uint8Array([0xff, 0x00, 0x00, 0xff]),
                })
            );

            const bmp = Bmp.read(buffer);

            expect(bmp.width).toEqual(2);
            expect(bmp.height).toEqual(2);
            expect(Array.from(new Uint8Array(bmp.redChannel))).toEqual([
                0x00, 0x00, 0xff, 0xff,
            ]);
            expect(Array.from(new Uint8Array(bmp.greenChannel))).toEqual([
                0x00, 0xff, 0x00, 0xff,
            ]);
            expect(Array.from(new Uint8Array(bmp.blueChannel))).toEqual([
                0xff, 0x00, 0x00, 0xff,
            ]);
        });
    });
});
