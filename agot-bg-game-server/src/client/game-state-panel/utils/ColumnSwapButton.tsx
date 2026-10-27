import React, { Component } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightLeft } from "@fortawesome/free-solid-svg-icons";
import { observer } from "mobx-react";
import { t } from "../../i18n";

interface ColumnSwapButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

@observer
export default class ColumnSwapButton extends Component<ColumnSwapButtonProps> {
  render(): React.ReactNode {
    return (
      <button
        type="button"
        className="icon-button"
        aria-label={t("gameStateColumn.swapColumns")}
        title={t("gameStateColumn.swapColumns")}
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
