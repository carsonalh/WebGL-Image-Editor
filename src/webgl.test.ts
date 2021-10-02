import { getGlImageSize } from './webgl';

describe('getGlImageSize', () => {
    it('returns 1x1 given 0x0', () => {
        expect(getGlImageSize(0, 0)).toEqual([1, 1]);
    });

    it('returns 2x2 if the width or height <= 2', () => {
        expect(getGlImageSize(1, 2)).toEqual([2, 2]);
        expect(getGlImageSize(2, 1)).toEqual([2, 2]);
        expect(getGlImageSize(2, 0)).toEqual([2, 2]);
    });

    it('returns 4x4 if the width or height is greater than 2', () => {
        expect(getGlImageSize(3, 2)).toEqual([4, 4]);
        expect(getGlImageSize(2, 3)).toEqual([4, 4]);
        expect(getGlImageSize(4, 1)).toEqual([4, 4]);
    });

    it('returns 32x32 if that is the next highest power of the max', () => {
        expect(getGlImageSize(3, 17)).toEqual([32, 32]);
        expect(getGlImageSize(32, 16)).toEqual([32, 32]);
        expect(getGlImageSize(17, 4)).toEqual([32, 32]);
    });
});
