import { DomainError } from './index.ts';
import { COVER_LIMITS } from './content-presentation.ts';
/** Inspect raster dimensions before asking the browser to allocate a decoder. */
export function coverImage(bytes: Uint8Array, mime: string): {
    width: number;
    height: number;
} {
    const bad = (): never => { throw new DomainError('invalid'); };
    if (bytes.length < 16 || bytes.length > COVER_LIMITS.bytes)
        return bad();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const word = (at: number, n: number) => String.fromCharCode(...bytes.subarray(at, at + n));
    let width = 0, height = 0;
    if (mime === 'image/png') {
        if (bytes.length < 33)
            return bad();
        if (word(0, 8) !== '\x89PNG\r\n\x1a\n' || word(12, 4) !== 'IHDR' || view.getUint32(8) !== 13)
            return bad();
        width = view.getUint32(16);
        height = view.getUint32(20);
        for (let i = 8; i + 12 <= bytes.length;) {
            const length = view.getUint32(i), type = word(i + 4, 4);
            if (length > bytes.length - i - 12)
                return bad();
            if (type === 'acTL')
                return bad();
            if (type === 'IDAT')
                break;
            i += length + 12;
        }
    }
    else if (mime === 'image/jpeg') {
        if (bytes[0] !== 255 || bytes[1] !== 216)
            return bad();
        for (let i = 2; i + 4 <= bytes.length;) {
            if (bytes[i++] !== 255)
                return bad();
            while (bytes[i] === 255)
                i++;
            const marker = bytes[i++]!;
            if (marker === 0xda || marker === 0xd9)
                break;
            const length = view.getUint16(i);
            if (length < 2 || length > bytes.length - i)
                return bad();
            if ([0xc0, 0xc1, 0xc2].includes(marker)) {
                if (length < 8)
                    return bad();
                height = view.getUint16(i + 3);
                width = view.getUint16(i + 5);
                break;
            }
            i += length;
        }
    }
    else if (mime === 'image/webp') {
        if (word(0, 4) !== 'RIFF' || word(8, 4) !== 'WEBP' || view.getUint32(4, true) + 8 !== bytes.length)
            return bad();
        const type = word(12, 4);
        if (type === 'VP8X' && bytes.length >= 30) {
            if (bytes[20]! & 2)
                return bad();
            width = 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16);
            height = 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16);
        }
        else if (type === 'VP8 ' && bytes.length >= 30 && word(23, 3) === '\x9d\x01\x2a') {
            width = view.getUint16(26, true) & 0x3fff;
            height = view.getUint16(28, true) & 0x3fff;
        }
        else if (type === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
            const bits = view.getUint32(21, true);
            width = 1 + (bits & 0x3fff);
            height = 1 + ((bits >>> 14) & 0x3fff);
        }
    }
    else
        return bad();
    if (width < 1 || height < 1 || width > COVER_LIMITS.width || height > COVER_LIMITS.height)
        return bad();
    return { width, height };
}
