import EntireGame from "../../src/common/EntireGame";
import GameState from "../../src/common/GameState";
import EntireGameContext, {AsFunction} from "./EntireGameContext";
import BetterMap from "../../src/utils/BetterMap";

export default class GlobalContext<E extends GameState<any, any>> {
    clientEntireGames: BetterMap<string, EntireGameContext<E>>;
    masterEntireGame: EntireGameContext<E>;

    get master(): EntireGameContext<E> {
        return this.masterEntireGame;
    }

    get clients(): EntireGameContext<E>[] {
        return this.clientEntireGames.values;
    }

    get lannister(): EntireGameContext<E> {
        return this.clientEntireGames.get("1");
    }

    get stark(): EntireGameContext<E> {
        return this.clientEntireGames.get("2");
    }

    get baratheon(): EntireGameContext<E> {
        return this.clientEntireGames.get("3");
    }

    get greyjoy(): EntireGameContext<E> {
        return this.clientEntireGames.get("4");
    }

    constructor(masterEntireGame: EntireGame, clientEntireGames: BetterMap<string, EntireGame>) {
        this.masterEntireGame = new EntireGameContext<E>(masterEntireGame);
        this.clientEntireGames = new BetterMap<string, EntireGameContext<E>>(
            clientEntireGames.entries
                .map(([uid, entireGame]) => [uid, new EntireGameContext<E>(entireGame)])
        );
    }

    expectGameState<GS extends GameState<any, any>>(gameState: any): GlobalContext<GS> {
        // Check that all entire games are indeed at this game state
        this.master.expectGameState(gameState);
        this.clients.forEach(c => c.expectGameState(gameState));

        // @ts-ignore
        return this as GlobalContext<GS>;
    }

    forEachClients(f: AsFunction<E>): void {
        this.clients.forEach(c => c.as(f));
    }

    forEach(f: AsFunction<E>): void {
        this.master.as(f);
        this.forEachClients(f);
    }

    execute<K extends GameState<any, any>>(f: (globalContext: GlobalContext<E>) => GlobalContext<K> | void): GlobalContext<K> {
        const newGlobalContext = f(this);

        // @ts-ignore Can't find a way to fix this error.
        // If "f" doesn't return anything (which happens for the last execute of a test suite), we want to return
        // the same GlobalContext, but Typescript doesn't allow it "this" does not overlap with GlobalContext<K>.
        return newGlobalContext ? newGlobalContext : (this as GlobalContext<K>);
    }
}
