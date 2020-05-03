import { Component, ReactNode } from "react";
import User from "../server/User";
import React from "react";
import { observer } from "mobx-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faWifi} from "@fortawesome/free-solid-svg-icons/faWifi";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

interface UserLabelProps {
    user: User;
}

@observer
export default class UserLabel extends Component<UserLabelProps> {
    get user(): User {
        return this.props.user;
    }

    render(): ReactNode {
        return (
            <>
                <div className="small">
                    <OverlayTrigger overlay={<Tooltip id ={`${this.user.id}-connected`}>{this.user.connected ? "Connected" : "Disconnected"}</Tooltip>}>
                        <FontAwesomeIcon icon={faWifi} className={this.user.connected ? "text-success" : "text-danger"} />
                    </OverlayTrigger>
                    {" "}
                    <a href={`/user/${this.user.id}`} target="_blank" rel="noopener noreferrer" className="text-body">
                        {this.user.name}
                    </a>
                </div>
            </>
        );
    }
}