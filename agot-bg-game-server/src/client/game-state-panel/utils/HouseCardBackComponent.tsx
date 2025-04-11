import { Component, default as React, ReactNode } from "react";
import { observer } from "mobx-react";
import houseCardImages from "../../houseCardImages";
import classNames from "classnames";
import House from "../../../common/ingame-game-state/game-data-structure/House";
import houseCardsBackImages from "../../houseCardsBackImages";
import HouseCard from "../../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import { preventOverflow } from "@popperjs/core";
import ImagePopover from "../../utils/ImagePopover";
import HouseSnapshot from "../../../common/ingame-game-state/game-data-structure/game-replay/HouseSnapshot";

interface HouseCardBackComponentProps {
  house: House | HouseSnapshot | null;
  houseCard: HouseCard;
  size?: "small" | "medium" | "tiny";
}

@observer
export default class HouseCardBackComponent extends Component<HouseCardBackComponentProps> {
  render(): ReactNode {
    return (
      <OverlayTrigger
        overlay={
          <ImagePopover
            className="vertical-game-card bring-to-front"
            style={{
              backgroundImage: `url(${houseCardImages.get(this.props.houseCard.id)})`,
            }}
          />
        }
        popperConfig={{ modifiers: [preventOverflow] }}
        delay={{ show: 250, hide: 0 }}
        placement="auto"
      >
        <div
          className={classNames(
            "vertical-game-card hover-weak-outline",
            this.props.size
          )}
          style={{
            backgroundImage: `url(${houseCardsBackImages.get(this.props.house ? this.props.house.id : "vassal")})`,
          }}
        />
      </OverlayTrigger>
    );
  }
}
