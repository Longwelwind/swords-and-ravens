import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Badge, Col, OverlayTrigger, Row } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import loanCardImages from "./loanCardImages";
import ImagePopover from "./utils/ImagePopover";
import { preventOverflow } from "@popperjs/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretLeft } from "@fortawesome/free-solid-svg-icons";
import IronBankSnapshotComponent from "./IronBankSnapshotComponent";
import IIronBankSnapshot from "./game-replay/IronBankSnapshot";

interface IronBankSnapshotTabComponentProps {
  ingame: IngameGameState;
  ironBank: IIronBankSnapshot;
}

@observer
export default class IronBankSnapshotTabComponent extends Component<IronBankSnapshotTabComponentProps> {
  get ingame(): IngameGameState {
    return this.props.ingame;
  }

  render(): ReactNode {
    return (
      <Col xs={12} className="h-100">
        <Row className="justify-content-center">
          <Col xs="11" style={{ maxWidth: "550px", maxHeight: "225px" }}>
            <IronBankSnapshotComponent
              ingame={this.ingame}
              ironBank={this.props.ironBank}
            />
          </Col>
        </Row>
        <Row className="justify-content-center mt-4">
          {this.props.ironBank.loanSlots
            .slice()
            .reverse()
            .map((lc, i) => (
              <Col xs="auto" key={`loan-slot-${i}`} className="pr-0">
                <OverlayTrigger
                  overlay={
                    <ImagePopover
                      className="vertical-game-card bring-to-front"
                      style={{
                        backgroundImage: lc
                          ? `url(${loanCardImages.get(lc)})`
                          : "none",
                      }}
                    />
                  }
                  popperConfig={{ modifiers: [preventOverflow] }}
                  delay={{ show: 250, hide: 0 }}
                  placement="auto"
                >
                  <div className="d-flex flex-row align-items-center">
                    {lc ? (
                      <div
                        className="vertical-game-card smedium hover-weak-outline"
                        style={{
                          backgroundImage: lc
                            ? `url(${loanCardImages.get(lc)})`
                            : "none",
                        }}
                      />
                    ) : (
                      <div className="vertical-game-card game-card-slot smedium" />
                    )}
                    <FontAwesomeIcon
                      className="ml-2"
                      icon={faCaretLeft}
                      size="2x"
                    />
                  </div>
                </OverlayTrigger>
                <Badge
                  variant="secondary"
                  style={{
                    fontSize: "1.125rem",
                    marginTop: "10px",
                    marginLeft: "35px",
                  }}
                >
                  {this.ingame.game.theIronBank.loanCosts.slice().reverse()[i]}
                </Badge>
              </Col>
            ))}
          <Col xs="auto">
            <div
              className="vertical-game-card smedium"
              style={{
                backgroundImage: `url(${loanCardImages.get("back")})`,
              }}
            />
          </Col>
        </Row>
      </Col>
    );
  }
}
