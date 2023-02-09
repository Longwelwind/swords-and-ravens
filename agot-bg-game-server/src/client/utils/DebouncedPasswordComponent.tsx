import { Component, default as React, ReactNode } from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import hidePasswordImage from "../../../public/images/icons/hide-password.svg";
import showPasswordImage from "../../../public/images/icons/show-password.svg";
import _ from "lodash";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import ConditionalWrap from "./ConditionalWrap";

interface DebouncedPasswordComponentProps {
    onChangeCallback: (value: string) => void;
    password: string;
    placeHolder?: string;
    tooltip?: OverlayChildren;
    width?: number;
}

@observer
export default class DebouncedPasswordComponent extends Component<DebouncedPasswordComponentProps> {
    @observable revealed = false;
    @observable password = this.props.password;

    debounce = _.debounce((val) => this.props.onChangeCallback(val), 500, { trailing: true });
    render(): ReactNode {
        return <div className="d-flex" style={{width: this.props.width ? this.props.width : "auto"}}>
            <ConditionalWrap
                condition={this.props.tooltip != undefined}
                wrap={children =>
                    <OverlayTrigger
                        overlay={this.props.tooltip ?? <></>}
                        placement="top"
                    >
                        {children}
                    </OverlayTrigger>
                }
            >
                <input className="form-control form-control-sm flex-grow-1"
                    placeholder={this.props.placeHolder}
                    type={this.revealed ? "text" : "password"}
                    value={this.password}
                    onKeyUp={() => this.debounce(this.password)}
                    onChange={e => this.password = e.target.value}
                />
            </ConditionalWrap>
            <OverlayTrigger
                overlay={<Tooltip id="show-hide-pw-tooltip">
                    {this.revealed ? "Hide password" : "Show password"}</Tooltip>
                }
                placement="top"
            >
                <img
                    src={this.revealed ? hidePasswordImage : showPasswordImage}
                    onClick={() => this.revealed = !this.revealed}
                    style={{ width: 24 }}
                />
            </OverlayTrigger>
        </div>

    }
}
