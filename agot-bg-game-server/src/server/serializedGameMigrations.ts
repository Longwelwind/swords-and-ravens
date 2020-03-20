import westerosCardImages from "../client/westerosCardImages";

const serializedGameMigrations: {version: string; migrate: (serializeGamed: any) => any}[] = [
    {
        version: "2",
        migrate: (serializedGame: any) => {
            // Migration for #292
            if (serializedGame.childGameState.type == "ingame") {
                // The goal is to find a deckI for each card referenced
                // in "(westeros-card-exe)cuted". Anyone will do, as long
                // as it exists.
                const ingame = serializedGame.childGameState;

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "westeros-card-executed")
                    .forEach((log: any) => {
                        log.westerosDeckI = (westerosCardImages.entries
                            .find(([_, images]) => images.entries.some(([id, _]) => id == log.westerosCardType)) as [number, any])[0];
                    });
            }

            // Migration for #336
            serializedGame.gameSettings.setupId = "base-game";
        }
    }
];

export default serializedGameMigrations;