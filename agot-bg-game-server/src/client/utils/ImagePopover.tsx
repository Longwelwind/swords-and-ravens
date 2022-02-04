import classNames from 'classnames';
import PropTypes from 'prop-types';
import * as React from 'react';

export interface ImagePopoverProps
  extends React.HTMLAttributes<HTMLDivElement> {
  arrowProps?: any;
}

const ImagePopover = React.forwardRef<HTMLDivElement, ImagePopoverProps>(
  (
    {
      className,
      style,
      arrowProps: _,
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
ImagePopover.propTypes = {
    className: PropTypes.any,
    style: PropTypes.any,
    arrowProps: PropTypes.any
};

export default ImagePopover;
