import EntireGame from "../common/EntireGame";

export default class SnrError extends Error {
    constructor(entireGame: EntireGame, msg?: string) {
        msg = `Error in game ${entireGame.id}: ${msg}`;
        super(msg);
    }
}