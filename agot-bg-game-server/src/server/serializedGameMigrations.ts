const serializedGameMigrations: {version: string; migrate: (serializeGamed: any) => any}[] = [
    {
        version: "2",
        migrate: (serializedGame: any) => {
            // This is a fake migration, it will be replaced in a later Pull Request
            return serializedGame;
        }
    }
];

export default serializedGameMigrations;