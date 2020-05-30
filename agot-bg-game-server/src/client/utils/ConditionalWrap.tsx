import {ReactElement} from "react";
import React from "react";

interface ConditionalWrapProps {
    condition: boolean;
    wrap: (children: ReactElement) => ReactElement;
    children: ReactElement;
}

const ConditionalWrap = ({condition, wrap, children}: ConditionalWrapProps): ReactElement => condition ? wrap(children) : children;

export default ConditionalWrap;
