import React from "react"
import { Modal } from "react-bootstrap"

interface ConfirmDialogOptions {
    body?: React.ReactNode | null;
    title?: React.ReactNode | null;
    yesAction: (() => void) | null;
    noAction: (() => void) | null;
}

interface Props {
}

interface State {
    showModal: boolean;
    body?: React.ReactNode | null;
    title?: React.ReactNode | null;
    yesAction: (() => void) | null;
    noAction: (() => void) | null;
}

export default class ConfirmDialog extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            showModal: false,
            body: null,
            title: null,
            yesAction: null,
            noAction: null
        }
    }

    componentWillUnmount() {
        if (this.state.showModal) {
            this.hide();
        }
    }


    render() {
        return (
            <Modal show={this.state.showModal}
                onHide={() => {
                    this.hide();
                    this.state.noAction && this.state.noAction();
                }}
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered>
                {
                    this.state.title && (
                        <Modal.Header>
                            <Modal.Title>
                                typeof this.state.title === 'string'
                                    ? (<p>{this.state.title}</p>)
                            : this.state.title
                            </Modal.Title>
                        </Modal.Header>
                    )
                }
                <Modal.Body>
                    {
                        typeof this.state.body === 'string'
                            ? (<p>{this.state.body}</p>)
                            : this.state.body
                    }
                </Modal.Body>
                <Modal.Footer>
                    {
                        <span>
                            <button
                                type='button'
                                className={`btn btn-sm`}
                                onClick={() => {
                                    this.hide();
                                    this.state.yesAction && this.state.yesAction();
                                }}
                                style={{ minWidth: 82 }}>
                                Yes
                            </button>
                            <button
                                type='button'
                                className={`btn btn-sm`}
                                onClick={() => {
                                    this.hide();
                                    this.state.noAction && this.state.noAction();
                                }}
                                style={{ minWidth: 82 }}>
                                No
                            </button>
                        </span>
                    }
                </Modal.Footer>
            </Modal>
        )
    }

    public show(options: ConfirmDialogOptions) {
        this.setState({
            showModal: true,
            body: options.body,
            title: options.title,
            yesAction: options.yesAction,
            noAction: options.noAction
        });
    }

    private hide() {
        if (!this.state.showModal) {
            return;
        }

        this.setState({ showModal: false });
    }
}