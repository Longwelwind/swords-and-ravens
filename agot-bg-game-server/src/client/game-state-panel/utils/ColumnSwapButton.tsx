import React, { Component } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightLeft } from "@fortawesome/free-solid-svg-icons";

interface ColumnSwapButtonProps {
  user: any;
  columnSwapAnimationClassName: string;
  colSwapAnimationClassChanged: (classname: string) => void;
  tracksPopoverVisibleChanged: (visible: boolean) => void;
}

export default class ColumnSwapButton extends Component<ColumnSwapButtonProps> {
  private handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    const {
      user,
      columnSwapAnimationClassName,
      colSwapAnimationClassChanged,
      tracksPopoverVisibleChanged,
    } = this.props;

    if (user && columnSwapAnimationClassName === "") {
      e.currentTarget.blur();
      const animationClass = "animate__animated animate__fadeIn";
      colSwapAnimationClassChanged(animationClass);
      user.settings.responsiveLayout = !user.settings.responsiveLayout;
      tracksPopoverVisibleChanged(false);
      window.setTimeout(() => {
        colSwapAnimationClassChanged("");
      }, 2050);
    }
  };

  render(): React.ReactNode {
    return (
      <button
        type="button"
        className="close"
        onClick={this.handleClick}
        style={{ position: "absolute", left: "0px", padding: "4px" }}
      >
        <FontAwesomeIcon
          icon={faRightLeft}
          style={{ color: "white" }}
          size="2xs"
        />
      </button>
    );
  }
}
