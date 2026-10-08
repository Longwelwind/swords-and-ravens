import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import React from "react";
import { Button, Col, Row } from "react-bootstrap";
import Region from "../../../common/ingame-game-state/game-data-structure/Region";
import { observable } from "mobx";
import _ from "lodash";
import PartialRecursive from "../../../utils/PartialRecursive";
import { RegionOnMapProperties } from "../../MapControls";
import IngameGameState from "../../../common/ingame-game-state/IngameGameState";
import ResolveMoveLoyaltyTokenGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/move-loyalty-tokens-game-state/resolve-move-loyalty-token-game-state/ResolveMoveLoyaltyTokenGameState";

@observer
export default class ResolveMoveLoyaltyTokenComponent extends Component<
  GameStateComponentProps<ResolveMoveLoyaltyTokenGameState>
> {
  @observable from: Region | null = null;
  @observable to: Region | null = null;
  // Set after confirming until the server answered with "loyalty-token-moved" or a rejection
  @observable waitingForServer = false;
  previewAnimationId: number | null = null;

  modifyRegionsOnMapCallback: any;

  onLoyaltyTokenMovedCallback = (from: Region, to: Region): void =>
    this.onLoyaltyTokenMoved(from, to);
  onLoyaltyTokenMoveRejectedCallback = (): void =>
    this.onLoyaltyTokenMoveRejected();

  get gameState(): ResolveMoveLoyaltyTokenGameState {
    return this.props.gameState;
  }

  get ingame(): IngameGameState {
    return this.gameState.ingame;
  }

  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          House <b>{this.gameState.house.name}</b> must move a
          loyalty&nbsp;token to an adjacent land area.
        </Col>
        <Col xs={12} className="mt-2">
          {this.props.gameClient.doesControlHouse(this.gameState.house) ? (
            <>
              <p className="text-center">
                Move a loyalty&nbsp;token from{" "}
                {this.from ? (
                  <>
                    <b>{this.from.name}</b> to{" "}
                  </>
                ) : (
                  ""
                )}
                {this.to ? <b>{this.to.name}</b> : ""}
              </p>
              <Row className="justify-content-center">
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="success"
                    onClick={() => this.confirm()}
                    disabled={
                      this.from == null ||
                      this.to == null ||
                      this.waitingForServer
                    }
                  >
                    Confirm
                  </Button>
                </Col>
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => this.reset()}
                    disabled={
                      (this.from == null && this.to == null) ||
                      this.waitingForServer
                    }
                  >
                    Reset
                  </Button>
                </Col>
              </Row>
            </>
          ) : (
            <div className="text-center">
              Waiting for {this.gameState.house.name}...
            </div>
          )}
        </Col>
      </>
    );
  }

  confirm(): void {
    if (this.from == null || this.to == null) {
      return;
    }

    // The local preview is kept until the server answers. It is either confirmed by
    // "loyalty-token-moved" (see onLoyaltyTokenMoved) or undone by "loyalty-token-move-rejected".
    this.waitingForServer = true;
    this.gameState.sendMovePowerTokens(this.from, this.to);
  }

  private reset(): void {
    if (this.from != null && this.to != null) {
      this.ingame.undoLoyaltyTokenMoveOnClient(
        this.from,
        this.to,
        this.previewAnimationId
      );
    }
    this.clear();
  }

  // Forgets the preview without undoing it, e.g. because the server confirmed exactly this move
  private clear(): void {
    this.from = null;
    this.to = null;
    this.previewAnimationId = null;
    this.waitingForServer = false;
  }

  private onLoyaltyTokenMoved(from: Region, to: Region): void {
    if (this.from == null || this.to == null) {
      return;
    }

    if (this.from == from && this.to == to) {
      this.clear();
    } else {
      // E.g. the same player confirmed a different move on another device
      this.reset();
    }
  }

  private onLoyaltyTokenMoveRejected(): void {
    if (this.waitingForServer) {
      this.reset();
    }
  }

  modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
    if (
      !this.waitingForServer &&
      this.props.gameClient.doesControlHouse(this.props.gameState.house)
    ) {
      if (this.from == null) {
        return this.props.gameState.parentGameState.validFromRegions.map(
          (r) => [
            r,
            {
              highlight: { active: true },
              onClick: () => this.onRegionClick(r)
            }
          ]
        );
      } else if (this.from != null && this.to == null) {
        return this.props.gameState.parentGameState
          .getValidTargetRegions(this.from)
          .map((r) => [
            r,
            {
              highlight: { active: true },
              onClick: () => this.onRegionClick(r)
            }
          ]);
      }
    }

    return [];
  }

  onRegionClick(region: Region): void {
    if (this.from == null) {
      this.from = region;
    } else if (this.from != null && this.to == null) {
      this.to = region;
      this.previewAnimationId = this.ingame.moveLoyaltyTokenOnClient(
        this.from,
        this.to,
        this.ingame.canSeeLoyaltyTokenMove(
          this.props.gameClient,
          this.from,
          this.to
        )
      );
    }
  }

  componentDidMount(): void {
    this.ingame.onLoyaltyTokenMoved = this.onLoyaltyTokenMovedCallback;
    this.ingame.onLoyaltyTokenMoveRejected =
      this.onLoyaltyTokenMoveRejectedCallback;
    this.props.mapControls.modifyRegionsOnMap.push(
      (this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap())
    );
  }

  componentWillUnmount(): void {
    // Discard a preview that wasn't confirmed by the server so it doesn't corrupt the shared game model.
    // A confirmed move has already been cleared by onLoyaltyTokenMoved, making this a no-op.
    this.reset();

    if (this.ingame.onLoyaltyTokenMoved == this.onLoyaltyTokenMovedCallback) {
      this.ingame.onLoyaltyTokenMoved = null;
    }
    if (
      this.ingame.onLoyaltyTokenMoveRejected ==
      this.onLoyaltyTokenMoveRejectedCallback
    ) {
      this.ingame.onLoyaltyTokenMoveRejected = null;
    }

    _.pull(
      this.props.mapControls.modifyRegionsOnMap,
      this.modifyRegionsOnMapCallback
    );
  }
}
