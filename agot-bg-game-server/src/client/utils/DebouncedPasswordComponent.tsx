import {Component, default as React, ReactNode} from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import hidePasswordImage from "../../../public/images/icons/hide-password.svg";
import showPasswordImage from "../../../public/images/icons/show-password.svg";
import _ from "lodash";

interface DebouncedPasswordComponentProps {
    onChangeCallback: (value: string) => void;
    password: string;
}

@observer
export default class DebouncedPasswordComponent extends Component<DebouncedPasswordComponentProps> {
    @observable revealed = false;
    @observable password = this.props.password;

    debounce = _.debounce((val) => this.props.onChangeCallback(val), 500, {trailing: true});
    render(): ReactNode {
        return <span>
            <input
                placeholder="Password"
                type={this.revealed ? "text" : "password"}
                value={this.password}
                onKeyUp={() => this.debounce(this.password)}
                onChange={e => this.password = e.target.value}
            />
            <img
            title={this.revealed ? "Hide password" : "Show password"}
            src={this.revealed ? hidePasswordImage : showPasswordImage}
            onClick={() => this.revealed = !this.revealed}
            style={{width: 24}}
            />
        </span>
    }
}
