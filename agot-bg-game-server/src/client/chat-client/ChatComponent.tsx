import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameClient from "../GameClient";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import React from "react";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { observable } from "mobx";
import ChatClient, { Channel, Message } from "./ChatClient";
import EntireGame from "../../common/EntireGame";
// @ts-expect-error Somehow ts complains that this module cannot be found while it is
import ScrollToBottom from "react-scroll-to-bottom";
import { Alert, OverlayTrigger, Popover, Tooltip } from "react-bootstrap";
import User from "../../server/User";
import { preventOverflow } from "@popperjs/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceSmile, faSyncAlt } from "@fortawesome/free-solid-svg-icons";
import EmojiPicker, {
  Categories,
  EmojiStyle,
  SuggestionMode,
  Theme,
} from "emoji-picker-react";
import { isMobile } from "react-device-detect";
import classNames from "classnames";
import moment from "moment";
import ConditionalWrap from "../utils/ConditionalWrap";
import getElapsedSeconds, {
  getTimeDeltaInSeconds,
} from "../../utils/getElapsedSeconds";
import houseIconImages from "../houseIconImages";
import stoneThroneImage from "../../../public/images/icons/stone-throne.svg";
import diamondHiltImage from "../../../public/images/icons/diamond-hilt.svg";
import ravenImage from "../../../public/images/icons/raven.svg";
import spikedDragonHeadImage from "../../../public/images/icons/spiked-dragon-head.svg";
import barrelImage from "../../../public/images/icons/barrel.svg";
import mammothImage from "../../../public/images/icons/mammoth.svg";
import crownImage from "../../../public/images/icons/crown.svg";

interface ChatComponentProps {
  gameClient: GameClient;
  entireGame: EntireGame;
  roomId: string;
  /**
   * A function that is called between each messages, and allow custom components that are
   * managed externally to be put between messages. Used, for example, for in-game vote status.
   */
  injectBetweenMessages: (
    previousMessage: Message | null,
    nextMessage: Message | null,
  ) => ReactNode;

  getUserDisplayName: (user: User) => ReactNode;
  /**
   * This property indicates whether this component can be viewed by the user.
   * If the component is inside a Tab component, it can hidden if an other Tab is opened.
   * This property allows the component to mark know whether or not the new messages are seen by the user
   * and thus if they can be marked as seen.
   */
  currentlyViewed: boolean;
}

@observer
export default class ChatComponent extends Component<ChatComponentProps> {
  private chatContainerRef = React.createRef<HTMLDivElement>();
  private chatInputRef = React.createRef<HTMLInputElement>();

  @observable inputText = "";
  @observable noMoreMessages = false;
  @observable selectedMessageId: string | null = null;
  @observable containerWidth: number | undefined = 600;

  onResizeCallback: (() => void) | null = null;
  audioPlayed = false;
  debounceTimeout?: number;

  static defaultProps = {
    injectBetweenMessages: (): any => <></>,
    getUserDisplayName: (u: User): any => <>{u.name}</>,
  };

  get chatClient(): ChatClient {
    return this.props.gameClient.chatClient;
  }

  get channel(): Channel {
    return this.chatClient.channels.get(this.props.roomId);
  }

  static customEmojis = [
    {
      id: ":baratheon:",
      names: ["Baratheon"],
      imgUrl: houseIconImages.get("baratheon"),
    },
    {
      id: ":lannister:",
      names: ["Lannister"],
      imgUrl: houseIconImages.get("lannister"),
    },
    {
      id: ":stark:",
      names: ["Stark"],
      imgUrl: houseIconImages.get("stark"),
    },
    {
      id: ":bolton:",
      names: ["Bolton"],
      imgUrl: houseIconImages.get("bolton"),
    },
    {
      id: ":martell:",
      names: ["Martell"],
      imgUrl: houseIconImages.get("martell"),
    },
    {
      id: ":greyjoy:",
      names: ["Greyjoy"],
      imgUrl: houseIconImages.get("greyjoy"),
    },
    {
      id: ":tyrell:",
      names: ["Tyrell"],
      imgUrl: houseIconImages.get("tyrell"),
    },
    {
      id: ":arryn:",
      names: ["Arryn"],
      imgUrl: houseIconImages.get("arryn"),
    },
    {
      id: ":targaryen:",
      names: ["Targaryen"],
      imgUrl: houseIconImages.get("targaryen"),
    },
    {
      id: ":throne:",
      names: ["Throne"],
      imgUrl: stoneThroneImage,
    },
    {
      id: ":vsb:",
      names: ["Valyrian Steel Blade", "VSB"],
      imgUrl: diamondHiltImage,
    },
    {
      id: ":raven:",
      names: ["Raven"],
      imgUrl: ravenImage,
    },
    {
      id: ":wildlings:",
      names: ["Wildlings"],
      imgUrl: mammothImage,
    },
    {
      id: ":dragon:",
      names: ["Dragon"],
      imgUrl: spikedDragonHeadImage,
    },
    {
      id: ":supply:",
      names: ["Barrel", "Supply"],
      imgUrl: barrelImage,
    },
    {
      id: ":crown:",
      names: ["Crown"],
      imgUrl: crownImage,
    },
  ];

  // Create regex and map once for performance
  static customEmojiRegex = new RegExp(
    ChatComponent.customEmojis
      .map((emoji) => emoji.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
    "g",
  );

  static customEmojiMap = new Map(
    ChatComponent.customEmojis.map((emoji) => [emoji.id, emoji]),
  );

  static unicodeEmojiRegex = new RegExp(
    "^(?:" +
      "(?:" +
      "\\p{RI}\\p{RI}" + // Regional indicator pairs (flags)
      "|" +
      "\\p{Emoji}" + // Base emoji
      "(?:" + // Optional modifiers
      "\\p{Emoji_Modifier}" +
      "|\\u{FE0F}\\u{20E3}?" +
      "|[\\u{E0020}-\\u{E007E}]+\\u{E007F}" +
      ")?" +
      "(?:" + // Zero or more joined sequences
      "\\u{200D}\\p{Emoji}" + // Zero-width joiner + emoji
      "(?:" +
      "\\p{Emoji_Modifier}" +
      "|\\u{FE0F}\\u{20E3}?" +
      "|[\\u{E0020}-\\u{E007E}]+\\u{E007F}" +
      ")?" +
      ")*" +
      ")" +
      "|" +
      "[\\u{1f900}-\\u{1f9ff}\\u{2600}-\\u{26ff}\\u{2700}-\\u{27bf}]" + // Common emoji ranges
      ")+$",
    "u",
  );

  render(): ReactNode {
    const messages = this.channel.messages;
    /* const messages = [
      {
        createdAt: new Date(),
        id: "1",
        text: "Hello 😬 my friend :targaryen: :vsb:",
        user: this.props.entireGame.users.values[0],
      },
      {
        createdAt: new Date(),
        id: "2",
        text: "😬 :baratheon: :dragon:",
        user: this.props.entireGame.users.values[0],
      },
      {
        createdAt: new Date(),
        id: "3",
        text: "😶‍🌫️🥳👨‍👩‍👧‍👦7️⃣🇩🇪",
        user: this.props.entireGame.users.values[0],
      },
      {
        createdAt: new Date(),
        id: "4",
        text: "😶‍🌫️Party!!!🥳👨‍👩‍👧‍👦7️⃣🇩🇪",
        user: this.props.entireGame.users.values[0],
      },
    ];

    for (let i = 0; i < 5; i++) {
      const length = messages.length;
      for (let j = 0; j < length; j++) {
        messages.push(messages[j]);
      }
    } */
    return (
      <div ref={this.chatContainerRef} className="d-flex flex-column h-100">
        {/* Setting a fixed height seems to be the only solution to make ScrollToBottom work */}
        <ScrollToBottom
          className="mb-2 flex-fill-remaining"
          scrollViewClassName="overflow-x-auto"
          style={{ height: 300 }}
        >
          {/* In case there's no messages yet, inject with no messages as arguments */}
          {messages.length == 0 && (
            <React.Fragment key={"injected-for-all"}>
              {this.props.injectBetweenMessages(null, null)}
            </React.Fragment>
          )}
          {messages.map((m, i) => {
            const onlyEmojis = this.containsOnlyEmojis(m.text);
            return (
              <>
                {/* Inject before the first message */}
                {i == 0 && (
                  <React.Fragment key={"injected-before-" + m.id}>
                    {this.props.injectBetweenMessages(null, m)}
                  </React.Fragment>
                )}
                <Row
                  key={m.id}
                  className={classNames("mb-1 mt-0 mx-0 p-0", {
                    "align-items-center": onlyEmojis,
                  })}
                >
                  {this.renderMessage(i, messages, m, onlyEmojis)}
                </Row>
                {/* Inject between all messages and after the last */}
                <React.Fragment key={"injected-after-" + m.id}>
                  {this.props.injectBetweenMessages(
                    m,
                    messages.length > i + 1 ? messages[i + 1] : null,
                  )}
                </React.Fragment>
              </>
            );
          })}
          <button
            type="button"
            className="close"
            style={{
              position: "absolute",
              right: 12,
              top: 0,
              display: this.noMoreMessages ? "none" : "inline",
            }}
            onClick={(e: any) => {
              e.currentTarget.blur();
              this.loadMoreMessages();
              e.preventDefault();
            }}
          >
            <OverlayTrigger
              overlay={
                <Tooltip id="mute-tooltip">
                  {this.noMoreMessages ? (
                    <>There are no more messages</>
                  ) : (
                    <>Load more messages</>
                  )}
                </Tooltip>
              }
            >
              <FontAwesomeIcon icon={faSyncAlt} size="2xs" />
            </OverlayTrigger>
          </button>
        </ScrollToBottom>
        {!this.channel.connected ? (
          <div className="flex-nowrap justify-content-center">
            <Alert variant="warning" className="text-center">
              This chat is not connected. Please wait until the connection is
              established or reload the page.
            </Alert>
          </div>
        ) : (
          <Form>
            <Row className="d-flex align-items-center">
              <Col>
                <Form.Control
                  ref={this.chatInputRef}
                  size="lg"
                  type="text"
                  maxLength={200}
                  value={this.inputText}
                  onChange={(e: any) => (this.inputText = e.target.value)}
                />
              </Col>
              <Col xs="auto">
                <OverlayTrigger
                  overlay={
                    <Popover
                      id="emoji-picker"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        borderStyle: "none",
                      }}
                    >
                      <EmojiPicker
                        theme={Theme.DARK}
                        autoFocusSearch={!isMobile}
                        emojiStyle={
                          isMobile ? EmojiStyle.NATIVE : EmojiStyle.APPLE
                        }
                        suggestedEmojisMode={SuggestionMode.RECENT}
                        lazyLoadEmojis={true}
                        onEmojiClick={(emoji) => {
                          const input = this.chatInputRef.current;
                          const position =
                            input?.selectionStart ?? this.inputText.length;
                          this.inputText = [
                            this.inputText.slice(0, position),
                            emoji.emoji,
                            this.inputText.slice(position),
                          ].join("");
                        }}
                        previewConfig={{ showPreview: false }}
                        customEmojis={ChatComponent.customEmojis}
                        categories={[
                          {
                            category: Categories.SUGGESTED,
                            name: "Recently Used",
                          },
                          {
                            category: Categories.CUSTOM,
                            name: "Swords and Ravens",
                            icon: (
                              <img
                                src={ravenImage}
                                width={24}
                                height={24}
                                className="raven-category-icon"
                                style={{
                                  marginLeft: "-5px",
                                  filter:
                                    "brightness(0) saturate(100%) invert(56%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(91%) contrast(85%)",
                                  transition: "filter 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.filter =
                                    "brightness(0) saturate(100%) invert(39%) sepia(39%) saturate(1389%) hue-rotate(184deg) brightness(110%) contrast(88%)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.filter =
                                    "brightness(0) saturate(100%) invert(56%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(91%) contrast(85%)";
                                }}
                              />
                            ),
                          },
                          {
                            category: Categories.SMILEYS_PEOPLE,
                            name: "Smileys & People",
                          },
                          {
                            category: Categories.ANIMALS_NATURE,
                            name: "Animals & Nature",
                          },
                          {
                            category: Categories.FOOD_DRINK,
                            name: "Food & Drink",
                          },
                          {
                            category: Categories.TRAVEL_PLACES,
                            name: "Travel & Places",
                          },
                          {
                            category: Categories.ACTIVITIES,
                            name: "Activities",
                          },
                          {
                            category: Categories.OBJECTS,
                            name: "Objects",
                          },
                        ]}
                      />
                    </Popover>
                  }
                  placement="top-start"
                  trigger="click"
                  rootClose
                >
                  <div className="btn btn-outline-light">
                    <FontAwesomeIcon icon={faFaceSmile} size="2x" />
                  </div>
                </OverlayTrigger>
              </Col>
              <Col xs="auto">
                <Button
                  type="submit"
                  size="lg"
                  onClick={(e: any) => {
                    e.currentTarget.blur();
                    this.send();
                    e.preventDefault();
                  }}
                >
                  Send
                </Button>
              </Col>
            </Row>
          </Form>
        )}
      </div>
    );
  }

  private renderMessage(
    currentMsgIndex: number,
    messages: Message[],
    currentMessage: Message,
    onlyEmojis: boolean,
  ): ReactNode {
    return (
      <>
        <Col
          xs="12"
          className={classNames("p-0 m-0", {
            "px-2":
              this.props.gameClient.authenticatedUser == currentMessage.user,
            "d-none":
              currentMsgIndex > 0 &&
              messages[currentMsgIndex - 1].user == currentMessage.user &&
              getTimeDeltaInSeconds(
                currentMessage.createdAt,
                messages[currentMsgIndex - 1].createdAt,
              ) <= 90,
          })}
        >
          <div
            style={{ width: "fit-content" }}
            className={classNames("p-1 pl-2", {
              "float-right":
                this.props.gameClient.authenticatedUser == currentMessage.user,
              "own-message":
                this.props.gameClient.authenticatedUser == currentMessage.user,
              "foreign-message":
                this.props.gameClient.authenticatedUser != currentMessage.user,
            })}
          >
            {this.props.getUserDisplayName(currentMessage.user)}
            {this.getMoment(currentMessage)}
          </div>
        </Col>
        {this.props.gameClient.authenticatedUser == currentMessage.user && (
          <Col xs="4" />
        )}
        <OverlayTrigger
          overlay={
            <Tooltip id={"current-message-date-" + currentMessage.id}>
              {currentMessage.createdAt.toLocaleString()}
            </Tooltip>
          }
          placement="auto"
          popperConfig={{ modifiers: [preventOverflow] }}
          delay={{ hide: 0, show: 250 }}
        >
          <Col
            xs="8"
            className={classNames("px-0", {
              "px-2":
                this.props.gameClient.authenticatedUser == currentMessage.user,
            })}
          >
            <div
              style={{ width: "fit-content", overflowWrap: "anywhere" }}
              className={classNames("p-1 px-2", {
                "make-emojis-large": onlyEmojis,
                "float-right":
                  this.props.gameClient.authenticatedUser ==
                  currentMessage.user,
                "own-message":
                  this.props.gameClient.authenticatedUser ==
                  currentMessage.user,
                "foreign-message":
                  this.props.gameClient.authenticatedUser !=
                  currentMessage.user,
              })}
            >
              {this.renderTextWithCustomEmojis(currentMessage.text, onlyEmojis)}
            </div>
          </Col>
        </OverlayTrigger>
      </>
    );
  }

  private renderTextWithCustomEmojis(
    text: string,
    onlyEmojis: boolean,
  ): ReactNode {
    // Find all matches and their positions
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Reset regex state before using it
    ChatComponent.customEmojiRegex.lastIndex = 0;

    while ((match = ChatComponent.customEmojiRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Find the custom emoji data using the map for O(1) lookup
      const customEmoji = ChatComponent.customEmojiMap.get(match[0]);
      if (customEmoji) {
        parts.push(
          <img
            key={`emoji-${match.index}`}
            src={customEmoji.imgUrl}
            alt={customEmoji.id}
            style={{
              height: onlyEmojis ? "1.75em" : "1.5em",
              width: onlyEmojis ? "1.75em" : "1.5em",
              verticalAlign: "middle",
              display: "inline-block",
            }}
          />,
        );
      }

      lastIndex = ChatComponent.customEmojiRegex.lastIndex;
    }

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // If no custom emojis were found, return the original text
    return parts.length > 0 ? parts : text;
  }

  getMoment(message: Message): ReactNode {
    const elapsed = getElapsedSeconds(message.createdAt);
    const S_PER_DAY = 60 * 60 * 24;
    const S_PER_H = 60 * 60;

    const diffDays = Math.round(elapsed / S_PER_DAY);
    const diffH = Math.round(elapsed / S_PER_H);

    const result =
      diffH <= 12
        ? moment(message.createdAt).fromNow()
        : diffDays <= 5
          ? moment(message.createdAt).calendar()
          : message.createdAt.toLocaleString();

    return (
      <ConditionalWrap
        condition={diffH <= 12 || diffDays <= 5}
        wrap={(children) => (
          <OverlayTrigger
            overlay={
              <Tooltip id={"message-date-" + message.id}>
                {message.createdAt.toLocaleString()}
              </Tooltip>
            }
            placement="auto"
            popperConfig={{ modifiers: [preventOverflow] }}
            delay={{ hide: 0, show: 400 }}
          >
            {children}
          </OverlayTrigger>
        )}
      >
        <small className="text-muted mx-2">{result}</small>
      </ConditionalWrap>
    );
  }

  send(): void {
    if (this.inputText.length == 0) {
      return;
    }

    this.chatClient.sendMessage(this.channel, this.inputText);
    this.inputText = "";
  }

  loadMoreMessages(): void {
    if (!this.chatClient.loadMoreMessages(this.channel)) {
      this.noMoreMessages = true;
    }
  }

  containsOnlyEmojis(str: string): boolean {
    // Remove spaces for testing
    const stringToTest = str.replace(/ /g, "");

    // First check if it's empty after removing spaces
    if (stringToTest.length === 0) {
      return false;
    }

    // Remove all custom emojis from the string using the pre-created regex
    const withoutCustomEmojis = stringToTest.replace(
      ChatComponent.customEmojiRegex,
      "",
    );

    // If nothing is left, it was only custom emojis
    if (withoutCustomEmojis.length === 0) {
      return true;
    }

    // Check if remaining characters are only Unicode emojis
    return (
      ChatComponent.unicodeEmojiRegex.test(withoutCustomEmojis) &&
      Number.isNaN(Number(withoutCustomEmojis))
    );
  }

  onResize(): void {
    const width = this.chatContainerRef.current?.getBoundingClientRect()?.width;
    if (width && width > 0) {
      this.containerWidth = width;
    }
  }

  debouncedOnResize(): void {
    if (this.debounceTimeout) {
      window.clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = window.setTimeout(() => {
      this.onResize();
      this.debounceTimeout = undefined;
    }, 100);
  }

  componentDidMount(): void {
    this.channel.onMessage = (singleMessageRetrieved, noMoreMessages) =>
      this.onMessage(singleMessageRetrieved, noMoreMessages);
    this.onResize();
    const resizeCallback = (): void => this.debouncedOnResize();
    window.addEventListener("resize", resizeCallback);
    this.onResizeCallback = resizeCallback;
  }

  componentWillUnmount(): void {
    this.channel.onMessage = null;

    const resizeCallback = this.onResizeCallback;
    if (resizeCallback) {
      window.removeEventListener("resize", resizeCallback);
    }

    this.onResizeCallback = null;
  }

  componentDidUpdate(
    prevProps: Readonly<ChatComponentProps>,
    _prevState: Readonly<Record<string, unknown>>,
  ): void {
    if (this.props.currentlyViewed) {
      this.chatClient.markAsViewed(this.channel);
      this.audioPlayed = false;
    }

    if (!prevProps.currentlyViewed && this.props.currentlyViewed) {
      this.onResize();
    }
  }

  onMessage(singleMessageRetrieved: boolean, noMoreMessages: boolean): void {
    if (this.props.currentlyViewed) {
      this.chatClient.markAsViewed(this.channel);
      this.audioPlayed = false;
    } else if (singleMessageRetrieved && !this.audioPlayed) {
      this.props.gameClient.sfxManager.playNewMessageReceivedSound();
    }

    if (noMoreMessages) {
      this.noMoreMessages = true;
    }
  }
}
