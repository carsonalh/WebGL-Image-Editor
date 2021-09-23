import { Bmp } from './bmp';

describe('bmp with default options', () => {
    const bmp = Bmp.create();
    const buffer = bmp.toBuffer();
    const byteArray = new Uint8Array(buffer);

    it('creates an array large enough for the file header and the DIB header', () => {
        expect(buffer.byteLength).toBeGreaterThanOrEqual(0x20);
    });

    it('writes BM to the start of the file', () => {
        // Spells out 'BM' in ASCII
        expect(byteArray[0]).toEqual(0x42);
        expect(byteArray[1]).toEqual(0x4d);
    });

    it('writes decimal 12 to the first 4 bytes of the DIB header (starting at 0x0E)', () => {
        // Little endian is king
        expect(byteArray[0x0e]).toEqual(12);
        expect(byteArray[0x0f]).toEqual(0);
        expect(byteArray[0x10]).toEqual(0);
        expect(byteArray[0x11]).toEqual(0);
    });

    it('writes 1 as the number of color planes at offset 0x16', () => {
        expect(byteArray[0x16]).toEqual(0x01);
        expect(byteArray[0x17]).toEqual(0x00);
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
        expect(byteArray[0x18]).toEqual(0x18); // 24 in decimal
        expect(byteArray[0x19]).toEqual(0x00);
    });

    it('stores no data for an image with zero width and zero height', () => {
        expect(byteArray.length).toEqual(0x20);
    });

    it('stores the size of the whole file in the file header', () => {
        expect(byteArray[0x02]).toEqual(0x20);
        expect(byteArray[0x03]).toEqual(0x00);
        expect(byteArray[0x04]).toEqual(0x00);
        expect(byteArray[0x05]).toEqual(0x00);
    });
});

describe('bmp image of size 2x2', () => {
    const bmp = Bmp.create({
        width: 2,
        height: 2,
    });
    const buffer = bmp.toBuffer();
    const byteArray = new Uint8Array(buffer);

    it('pads 6 bytes of color data to 8 (4 byte alignment per row)', () => {
        // There should be 16 bytes of image data, as there are 2 rows
        expect(byteArray[0x02]).toEqual(0x30);
        expect(byteArray[0x03]).toEqual(0x00);
        expect(byteArray[0x04]).toEqual(0x00);
        expect(byteArray[0x05]).toEqual(0x00);
    });

    it('creates buffer of size 0x30 (0x20 header + 0x10 in image data)', () => {
        expect(buffer.byteLength).toEqual(0x30);
    });
});
