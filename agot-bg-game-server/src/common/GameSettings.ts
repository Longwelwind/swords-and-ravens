export enum HouseCardDecks {
  None = 0,
  BaseAndModA = 1 << 0, // 001
  DwdFfcModB = 1 << 1, // 010
  StormOfSwords = 1 << 2, // 100
  All = ~(~0 << 3), // 111
}

export class GameSettings {
  setupId = "mother-of-dragons";
  playerCount = 8;
  pbem = true;
  onlyLive = false;
  startWhenFull = false;
  private = false;
  randomHouses = false;
  randomChosenHouses = false;
  adwdHouseCards = false;
  asosHouseCards = false;
  cokWesterosPhase = false;
  vassals = true;
  seaOrderTokens = true;
  allowGiftingPowerTokens = true;
  ironBank = true;
  tidesOfBattle = false;
  draftHouseCards = false;
  draftTracks = false;
  thematicDraft = false;
  limitedDraft = false;
  randomDraft = false;
  perpetuumRandom = false;
  blindDraft = false;
  draftMap = false;
  selectedDraftDecks = HouseCardDecks.All;
  endless = false;
  useVassalPositions = false;
  precedingMustering = false;
  mixedWesterosDeck1 = false;
  removeTob3 = false;
  removeTobSkulls = false;
  limitTob2 = false;
  faceless = false;
  randomStartPositions = false;
  addPortToTheEyrie = false;
  victoryPointsCountNeededToWin = 7;
  loyaltyTokenCountNeededToWin = 7;
  randomVassalAssignment = false;
  customBalancing = false;
  houseCardsEvolution = false;
  houseCardsEvolutionRound = 5;
  initialLiveClock = 60;
  noPrivateChats = false;
  tournamentMode = false;
  fixedClock = false;
  holdVictoryPointsUntilEndOfRound = false;
  fogOfWar = false;
  dragonWar = false;
  dragonRevenge = false;

  static deserializeFromServer(data: SerializedGameSettings): GameSettings {
    const settings = new GameSettings();
    settings.setupId = data.setupId;
    settings.playerCount = data.playerCount;
    settings.pbem = data.pbem;
    settings.onlyLive = data.onlyLive ?? false;
    settings.startWhenFull = data.startWhenFull ?? false;
    settings.private = data.private ?? false;
    settings.randomHouses = data.randomHouses ?? false;
    settings.randomChosenHouses = data.randomChosenHouses ?? false;
    settings.adwdHouseCards = data.adwdHouseCards ?? false;
    settings.asosHouseCards = data.asosHouseCards ?? false;
    settings.cokWesterosPhase = data.cokWesterosPhase ?? false;
    settings.vassals = data.vassals ?? false;
    settings.seaOrderTokens = data.seaOrderTokens ?? false;
    settings.allowGiftingPowerTokens = data.allowGiftingPowerTokens ?? false;
    settings.ironBank = data.ironBank ?? false;
    settings.tidesOfBattle = data.tidesOfBattle ?? false;
    settings.draftHouseCards = data.draftHouseCards ?? false;
    settings.draftTracks = data.draftTracks ?? false;
    settings.thematicDraft = data.thematicDraft ?? false;
    settings.limitedDraft = data.limitedDraft ?? false;
    settings.randomDraft = data.randomDraft ?? false;
    settings.perpetuumRandom = data.perpetuumRandom ?? false;
    settings.blindDraft = data.blindDraft ?? false;
    settings.draftMap = data.draftMap ?? false;
    settings.selectedDraftDecks =
      data.selectedDraftDecks ?? settings.selectedDraftDecks;
    settings.endless = data.endless ?? false;
    settings.useVassalPositions = data.useVassalPositions ?? false;
    settings.precedingMustering = data.precedingMustering ?? false;
    settings.mixedWesterosDeck1 = data.mixedWesterosDeck1 ?? false;
    settings.removeTob3 = data.removeTob3 ?? false;
    settings.removeTobSkulls = data.removeTobSkulls ?? false;
    settings.limitTob2 = data.limitTob2 ?? false;
    settings.faceless = data.faceless ?? false;
    settings.randomStartPositions = data.randomStartPositions ?? false;
    settings.addPortToTheEyrie = data.addPortToTheEyrie ?? false;
    settings.victoryPointsCountNeededToWin =
      data.victoryPointsCountNeededToWin ??
      settings.victoryPointsCountNeededToWin;
    settings.loyaltyTokenCountNeededToWin =
      data.loyaltyTokenCountNeededToWin ??
      settings.loyaltyTokenCountNeededToWin;
    settings.randomVassalAssignment = data.randomVassalAssignment ?? false;
    settings.customBalancing = data.customBalancing ?? false;
    settings.houseCardsEvolution = data.houseCardsEvolution ?? false;
    settings.houseCardsEvolutionRound =
      data.houseCardsEvolutionRound ?? settings.houseCardsEvolutionRound;
    settings.initialLiveClock =
      data.initialLiveClock ?? settings.initialLiveClock;
    settings.noPrivateChats = data.noPrivateChats ?? false;
    settings.tournamentMode = data.tournamentMode ?? false;
    settings.fixedClock = data.fixedClock ?? false;
    settings.holdVictoryPointsUntilEndOfRound =
      data.holdVictoryPointsUntilEndOfRound ?? false;
    settings.fogOfWar = data.fogOfWar ?? false;
    settings.dragonWar = data.dragonWar ?? false;
    settings.dragonRevenge = data.dragonRevenge ?? false;
    return settings;
  }

  serializeToClient(): SerializedGameSettings {
    return {
      setupId: this.setupId,
      playerCount: this.playerCount,
      pbem: this.pbem,
      onlyLive: this.onlyLive || undefined,
      startWhenFull: this.startWhenFull || undefined,
      private: this.private || undefined,
      randomHouses: this.randomHouses || undefined,
      randomChosenHouses: this.randomChosenHouses || undefined,
      adwdHouseCards: this.adwdHouseCards || undefined,
      asosHouseCards: this.asosHouseCards || undefined,
      cokWesterosPhase: this.cokWesterosPhase || undefined,
      vassals: this.vassals || undefined,
      seaOrderTokens: this.seaOrderTokens || undefined,
      allowGiftingPowerTokens: this.allowGiftingPowerTokens || undefined,
      ironBank: this.ironBank || undefined,
      tidesOfBattle: this.tidesOfBattle || undefined,
      draftHouseCards: this.draftHouseCards || undefined,
      draftTracks: this.draftTracks || undefined,
      thematicDraft: this.thematicDraft || undefined,
      limitedDraft: this.limitedDraft || undefined,
      randomDraft: this.randomDraft || undefined,
      perpetuumRandom: this.perpetuumRandom || undefined,
      blindDraft: this.blindDraft || undefined,
      draftMap: this.draftMap || undefined,
      selectedDraftDecks: this.draftHouseCards
        ? this.selectedDraftDecks
        : undefined,
      endless: this.endless || undefined,
      useVassalPositions: this.useVassalPositions || undefined,
      precedingMustering: this.precedingMustering || undefined,
      mixedWesterosDeck1: this.mixedWesterosDeck1 || undefined,
      removeTob3: this.removeTob3 || undefined,
      removeTobSkulls: this.removeTobSkulls || undefined,
      limitTob2: this.limitTob2 || undefined,
      faceless: this.faceless || undefined,
      randomStartPositions: this.randomStartPositions || undefined,
      addPortToTheEyrie: this.addPortToTheEyrie || undefined,
      victoryPointsCountNeededToWin:
        this.victoryPointsCountNeededToWin != 7
          ? this.victoryPointsCountNeededToWin
          : undefined,
      loyaltyTokenCountNeededToWin:
        this.loyaltyTokenCountNeededToWin != 7
          ? this.loyaltyTokenCountNeededToWin
          : undefined,
      randomVassalAssignment: this.randomVassalAssignment || undefined,
      customBalancing: this.customBalancing || undefined,
      houseCardsEvolution: this.houseCardsEvolution || undefined,
      houseCardsEvolutionRound: this.houseCardsEvolution
        ? this.houseCardsEvolutionRound
        : undefined,
      initialLiveClock: this.onlyLive ? this.initialLiveClock : undefined,
      noPrivateChats: this.noPrivateChats || undefined,
      tournamentMode: this.tournamentMode || undefined,
      fixedClock: this.fixedClock || undefined,
      fogOfWar: this.fogOfWar || undefined,
      dragonWar: this.dragonWar || undefined,
      dragonRevenge: this.dragonRevenge || undefined,
      holdVictoryPointsUntilEndOfRound:
        this.holdVictoryPointsUntilEndOfRound || undefined,
    };
  }
}

export class SerializedGameSettings {
  setupId: string;
  playerCount: number;
  pbem: boolean;
  onlyLive?: boolean;
  startWhenFull?: boolean;
  private?: boolean;
  randomHouses?: boolean;
  randomChosenHouses?: boolean;
  adwdHouseCards?: boolean;
  asosHouseCards?: boolean;
  cokWesterosPhase?: boolean;
  vassals?: boolean;
  seaOrderTokens?: boolean;
  allowGiftingPowerTokens?: boolean;
  ironBank?: boolean;
  tidesOfBattle?: boolean;
  draftHouseCards?: boolean;
  draftTracks?: boolean;
  thematicDraft?: boolean;
  limitedDraft?: boolean;
  randomDraft?: boolean;
  blindDraft?: boolean;
  perpetuumRandom?: boolean;
  draftMap?: boolean;
  selectedDraftDecks?: number;
  endless?: boolean;
  useVassalPositions?: boolean;
  precedingMustering?: boolean;
  mixedWesterosDeck1?: boolean;
  removeTob3?: boolean;
  removeTobSkulls?: boolean;
  limitTob2?: boolean;
  faceless?: boolean;
  randomStartPositions?: boolean;
  addPortToTheEyrie?: boolean;
  victoryPointsCountNeededToWin?: number;
  loyaltyTokenCountNeededToWin?: number;
  randomVassalAssignment?: boolean;
  customBalancing?: boolean;
  houseCardsEvolution?: boolean;
  houseCardsEvolutionRound?: number;
  initialLiveClock?: number;
  noPrivateChats?: boolean;
  tournamentMode?: boolean;
  fixedClock?: boolean;
  holdVictoryPointsUntilEndOfRound?: boolean;
  fogOfWar?: boolean;
  dragonWar?: boolean;
  dragonRevenge?: boolean;
}
