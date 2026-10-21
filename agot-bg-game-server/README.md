# Swords and Ravens - Game Server

The game is architectured around a state-synchronization paradigm. The server and the players each holds a copy of the state of the game. When a player wants to do an action, they send a message to the server. The server validates it and processes it. The changes done to the state of the game (removed units, added or removed power tokens, ...) are sent back to the players.

The `src/` contains the code of the game server and is split into 5 folders:

- `client/` contains the code ran exclusively on the client. This includes `GameClient` which manages the connection to the game server and the UI that is rendered in the browser based on the state of the game.
- `server/` contains the code ran exclusively on the server. This includes the code that manages user connections and messages and communicating with the website.
- `common/` contains the code shared by both the client and the server. This includes the core logic of the game.
- `messages/` contains the definition of the JSON messages sent by the client and the server.
- `utils/` contains util functions and classes.

## Game-client translations

The React client uses i18next/react-i18next. English is the fallback language;
German, Spanish, Italian, French, Portuguese, Russian and Simplified Chinese can
be selected after the badges in the centered game title bar. The selection is
saved locally in the browser under `snr.game.language`, shared by all games on
the site; otherwise the browser language is used. Language is a presentation
preference, not part of the saved game or WebSocket protocol.

Translation resources are in `src/client/i18n/locales/`. Start with `en.json`
when adding a message and update the other language files. Reuse `common` keys
for shared controls and waiting messages. Snapshot/replay components should use
their live component's existing keys for identical explanatory text.

Use `t` from `src/client/i18n` in MobX-observed class components, or
`useTranslation` in function components. Use the local `Trans` component for
sentences containing formatting, icons or dynamic React content: its named
component placeholders can be reordered in translations without losing event
handlers or translating player/house names. Do not concatenate translated
sentence fragments.

Keep `{{interpolation}}` variables and named `<component/>`/`<component>...</component>`
tags intact. Use i18next plural families (`_one`, `_other`, and locale-specific
forms such as Russian `_few` and `_many`). A language may spell out "one" when
its singular category means exactly one; Russian singular forms must retain the
count because they also apply to numbers such as 21.

Only translate displayed text. CSS classes, animation names, element IDs,
protocol values, date-format options and emoji-picker category identifiers stay
unchanged. Proper names (houses, characters and locations), player-written chat
and notes are not translated. `translateGameText` localizes known shared rule
descriptions and choices at the rendering boundary, leaving authoritative game
state in English for existing rules and saved-game compatibility.

Run `yarn test-client` to check catalog coverage, placeholder integrity, language
switching and the existing client interactions.
