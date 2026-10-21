import classNames from "classnames";
import * as React from "react";
import { OverlayInjectedProps } from "react-bootstrap/Overlay";

export interface ImagePopoverProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    Partial<
      Pick<
        OverlayInjectedProps,
        "arrowProps" | "placement" | "popper" | "hasDoneInitialMeasure" | "show"
      >
    > {}

const ImagePopover = React.forwardRef<HTMLDivElement, ImagePopoverProps>(
  (
    {
      className,
      style,
      arrowProps: _,
      placement: _placement,
      popper: _popper,
      hasDoneInitialMeasure,
      show: _show,
      ...props
    }: ImagePopoverProps,
    ref
  ) => {
    return (
      <div
        ref={ref}
        // React-Bootstrap 2 only applies Popper's positioning after the first frame; until then
        // keep the popover out of the document flow (so it can't toggle the page scrollbar) and
        // invisible (so it can't cover the trigger and close itself).
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          visibility: hasDoneInitialMeasure === false ? "hidden" : undefined,
          ...style
        }}
        className={classNames(className)}
        {...props}
      />
    );
  }
);

ImagePopover.displayName = "ImagePopover";

export default ImagePopover;
