import { Component, default as React, ReactNode } from "react";
import { observer } from "mobx-react";
import Badge from "react-bootstrap/Badge";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import houseInfluenceImages from "../../houseInfluenceImages";
import barrelImage from "../../../../public/images/icons/barrel.svg";
import HouseSnapshot from "../../game-replay/HouseSnapshot";

interface ReplaySupplyTrackComponentProps {
  supplyRestrictions: number[][];
  houses: HouseSnapshot[];
}

@observer
export default class ReplaySupplyTrackComponent extends Component<ReplaySupplyTrackComponentProps> {
  modifyRegionsOnMapCallback: any;

  render(): ReactNode {
    return (
      <Row>
        <Col xs="auto">
          <img width="32px" src={barrelImage} alt="Supply" />
        </Col>
        <Col>
          <Row className="justify-content-center">
            {this.props.supplyRestrictions.map((allowedArmies, i) => (
              <Col
                xs="auto"
                key={`supply-track_${i}`}
                className="d-flex flex-column align-items-center"
              >
                <div>
                  <Badge variant="secondary" style={{ fontSize: "1rem" }}>
                    {i}
                  </Badge>
                </div>
                <div className="d-flex">
                  <div
                    style={{
                      width: "18px",
                      marginRight: "6px",
                      marginTop: "10px",
                    }}
                  >
                    {this.getHousesAtSupplyLevel(i).map((h) => (
                      <div
                        key={`supply-for-house_${h.id}`}
                        className="supply-icon hover-weak-outline"
                        style={{
                          backgroundImage: `url(${houseInfluenceImages.get(h.id)})`,
                          marginTop: "-5px",
                        }}
                      ></div>
                    ))}
                  </div>
                  <div>
                    {allowedArmies.map((size, i) => (
                      <div
                        style={{ marginBottom: "-6px" }}
                        key={`allowed-army-size_${i}`}
                      >
                        {size}
                      </div>
                    ))}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    );
  }

  getHousesAtSupplyLevel(supplyLevel: number): HouseSnapshot[] {
    return this.props.houses.filter((h) => h.supply == supplyLevel);
  }
}
