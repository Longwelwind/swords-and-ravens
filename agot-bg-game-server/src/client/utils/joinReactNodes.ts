import {ReactNode} from "react";

export default function joinReactNodes(elements: ReactNode[], separator: string) {
    return elements.reduce((prev, curr) => [prev, separator, curr]);
}
