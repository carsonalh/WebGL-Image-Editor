import { Bmp } from './bmp';

describe('bmp with default options', () => {
    const bmp = Bmp.create();
    const buffer = bmp.toBuffer();
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

describe('bmp image of size 2 x 2', () => {
    const bmp = Bmp.create({
        width: 2,
        height: 2,
    });
    const buffer = bmp.toBuffer();
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
    const buffer = bmp.toBuffer();
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
        redChannel: new Uint8Array([0xff, 0xff, 0x00, 0x00]),
        blueChannel: new Uint8Array([0x00, 0xff, 0xff, 0x00]),
        greenChannel: new Uint8Array([0x00, 0xff, 0x00, 0xff]),
    });
    const buffer = bmp.toBuffer();
    const byteArray = new Uint8Array(buffer);

    it('can write the image from wikipedia to bmp', () => {
        // Should be written as BGR

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
