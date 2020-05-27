import {ReactNode} from "react";

export default function joinReactNodes(elements: ReactNode[], separator: string): ReactNode {
    if (elements.length == 0) {
        return null;
    }

    return elements.reduce((prev, curr) => [prev, separator, curr]);
}
