import pako from "pako";

export function compress(data: string): string {
    return Buffer.from(pako.deflate(data)).toString("base64");
}

export function decompress(data: string): string {
    return pako.inflate(Buffer.from(data, "base64"), { to: "string" });
}
