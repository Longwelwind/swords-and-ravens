import classNames from 'classnames';
import * as React from 'react';

export interface ImagePopoverProps
  extends React.HTMLAttributes<HTMLDivElement> {
  arrowProps?: any;
  scheduleUpdate?: any;
  outOfBoundaries?: any;
}

const ImagePopover = React.forwardRef<HTMLDivElement, ImagePopoverProps>(
  (
    {
      className,
      style,
      arrowProps: _,
      scheduleUpdate: _2,
      outOfBoundaries: _3,
      ...props
    }: ImagePopoverProps,
    ref,
  ) => {
    return (
      <div
        ref={ref}
        style={style}
        className={classNames(className)}
        {...props}
      >
      </div>
    );
  },
);

ImagePopover.displayName="ImagePopover";

export default ImagePopover;