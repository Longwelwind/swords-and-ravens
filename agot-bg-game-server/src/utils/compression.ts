import pako from "pako";

export function compress(data: string): Uint8Array {
    return pako.deflate(data);
}

export async function decompressClient(data: Blob): Promise<string> {
    const array = new Uint8Array(await data.arrayBuffer());
    return pako.inflate(array, { to: "string" });
}

export function decompressServer(data: Buffer): string {
    const array = new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    return pako.inflate(array, { to: "string" });
}
