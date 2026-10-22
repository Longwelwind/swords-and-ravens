import React, { Component, ReactElement, ReactNode } from "react";
import MapControls, { MapLayer } from "./MapControls";

interface MapContributionProps extends MapLayer {
  mapControls: MapControls;
}

// Evaluate the wrapper in the contributor's render, not in the map's reaction.
export function wrapMapElement(
  element: ReactElement
): (child: ReactElement) => ReactElement {
  return (child) => React.cloneElement(element, undefined, child);
}

export default class MapContribution extends Component<MapContributionProps> {
  private readonly owner = Symbol("map-contribution");

  componentDidMount(): void {
    this.props.mapControls.setLayer(this.owner, this.props);
  }

  componentDidUpdate(previous: MapContributionProps): void {
    if (previous.mapControls != this.props.mapControls) {
      previous.mapControls.removeLayer(this.owner);
    }
    this.props.mapControls.setLayer(this.owner, this.props);
  }

  componentWillUnmount(): void {
    this.props.mapControls.removeLayer(this.owner);
  }

  render(): ReactNode {
    return null;
  }
}
