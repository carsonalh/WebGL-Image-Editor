import { parseColorInput } from './input';

it('can parse black', () => {
    expect(parseColorInput('#000000')).toEqual([0, 0, 0]);
});

it('can parse white', () => {
    expect(parseColorInput('#FFFFFF')).toEqual([255, 255, 255]);
});

it('can parse an inbetween color', () => {
    expect(parseColorInput('#FFC0DE')).toEqual([0xff, 0xc0, 0xde]);
});
