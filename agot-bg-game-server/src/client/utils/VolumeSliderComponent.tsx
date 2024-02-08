import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { observable } from 'mobx';
import { faVolumeLow, faVolumeUp, faVolumeXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface VolumeSliderComponentProps {
    volume: number;
    name?: string | React.ReactNode;
    onVolumeChange?: (newValue: number) => void;
}

@observer
class VolumeSliderComponent extends Component<VolumeSliderComponentProps> {
    @observable volume = Math.floor(this.props.volume);

    handleVolumeChange = (e: any): void => {
        const newVolume = typeof e === 'number' ? e : parseInt(e.target.value);
        this.volume = newVolume;
        if(this.props.onVolumeChange) {
            this.props.onVolumeChange(newVolume);
        }
    };

    render(): React.ReactNode {
        return (
            <Col>
                {this.props.name && <Row>
                    {this.props.name}: {this.volume}
                </Row>}
                <Row>
                    <Col style={{width: "32px"}}>
                        {this.volume === 0
                            ? <FontAwesomeIcon icon={faVolumeXmark} style={{color: "white"}} size="1x"/>
                            : <FontAwesomeIcon className="clickable" icon={faVolumeLow} style={{color: "white"}} size="1x" onClick={() => this.handleVolumeChange(0)}/>
                        }
                    </Col>
                    <Col xs="auto">
                        <Form.Control
                            type="range"
                            value={this.volume}
                            onChange={this.handleVolumeChange}
                            min={0}
                            max={100}
                            step={1}
                            style={{width: "200px", marginTop: "2px"}}
                        />
                    </Col>
                    <Col>
                        <FontAwesomeIcon className={this.volume != 100 ? "clickable" : ""} icon={faVolumeUp} style={{color: "white"}} size="1x"
                            onClick={() => {
                                if (this.volume != 100) {
                                    this.handleVolumeChange(100);
                                }
                            }}
                        />
                    </Col>
                </Row>
            </Col>
        );
    }
}

export default VolumeSliderComponent;
