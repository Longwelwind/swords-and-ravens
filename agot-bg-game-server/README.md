# Swords and Ravens - Game Server

The game is architectured around a state-synchronization paradigm. The server and the players each holds a copy of the state of the game. When a player wants to do an action, they send a message to the server. The server validates it and processes it. The changes done to the state of the game (removed units, added or removed power tokens, ...) are sent back to the players.

The `src/` contains the code of the game server and is split into 5 folders:

* `client/` contains the code ran exclusively on the client. This includes `GameClient` which manages the connection to the game server and the UI that is rendered in the browser based on the state of the game.
* `server/` contains the code ran exclusively on the server. This includes the code that manages user connections and messages and communicating with the website.
* `common/` contains the code shared by both the client and the server. This includes the core logic of the game.
* `messages/` contains the definition of the JSON messages sent by the client and the server.
* `utils/` contains util functions and classes.
