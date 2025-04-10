import React, { Component } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightLeft } from "@fortawesome/free-solid-svg-icons";

interface ColumnSwapButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default class ColumnSwapButton extends Component<ColumnSwapButtonProps> {
  render(): React.ReactNode {
    return (
      <button
        type="button"
        className="close"
        onClick={this.props.onClick}
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
