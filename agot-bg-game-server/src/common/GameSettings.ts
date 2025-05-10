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
  pbem = false;
  onlyLive = false;
  startWhenFull = false;
  private = false;
  randomHouses = false;
  randomChosenHouses = false;
  adwdHouseCards = false;
  asosHouseCards = false;
  cokWesterosPhase = false;
  vassals = false;
  seaOrderTokens = false;
  allowGiftingPowerTokens = false;
  ironBank = false;
  tidesOfBattle = false;
  draftHouseCards = false;
  thematicDraft = false;
  limitedDraft = false;
  randomDraft = false;
  perpetuumDraft = false;
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
    settings.onlyLive = data.onlyLive ?? settings.onlyLive;
    settings.startWhenFull = data.startWhenFull ?? settings.startWhenFull;
    settings.private = data.private ?? settings.private;
    settings.randomHouses = data.randomHouses ?? settings.randomHouses;
    settings.randomChosenHouses =
      data.randomChosenHouses ?? settings.randomChosenHouses;
    settings.adwdHouseCards = data.adwdHouseCards ?? settings.adwdHouseCards;
    settings.asosHouseCards = data.asosHouseCards ?? settings.asosHouseCards;
    settings.cokWesterosPhase =
      data.cokWesterosPhase ?? settings.cokWesterosPhase;
    settings.vassals = data.vassals ?? settings.vassals;
    settings.seaOrderTokens = data.seaOrderTokens ?? settings.seaOrderTokens;
    settings.allowGiftingPowerTokens =
      data.allowGiftingPowerTokens ?? settings.allowGiftingPowerTokens;
    settings.ironBank = data.ironBank ?? settings.ironBank;
    settings.tidesOfBattle = data.tidesOfBattle ?? settings.tidesOfBattle;
    settings.draftHouseCards = data.draftHouseCards ?? settings.draftHouseCards;
    settings.thematicDraft = data.thematicDraft ?? settings.thematicDraft;
    settings.limitedDraft = data.limitedDraft ?? settings.limitedDraft;
    settings.randomDraft = data.randomDraft ?? settings.randomDraft;
    settings.perpetuumDraft = data.perpetuumDraft ?? settings.perpetuumDraft;
    settings.blindDraft = data.blindDraft ?? settings.blindDraft;
    settings.draftMap = data.draftMap ?? settings.draftMap;
    settings.selectedDraftDecks =
      data.selectedDraftDecks ?? settings.selectedDraftDecks;
    settings.endless = data.endless ?? settings.endless;
    settings.useVassalPositions =
      data.useVassalPositions ?? settings.useVassalPositions;
    settings.precedingMustering =
      data.precedingMustering ?? settings.precedingMustering;
    settings.mixedWesterosDeck1 =
      data.mixedWesterosDeck1 ?? settings.mixedWesterosDeck1;
    settings.removeTob3 = data.removeTob3 ?? settings.removeTob3;
    settings.removeTobSkulls = data.removeTobSkulls ?? settings.removeTobSkulls;
    settings.limitTob2 = data.limitTob2 ?? settings.limitTob2;
    settings.faceless = data.faceless ?? settings.faceless;
    settings.randomStartPositions =
      data.randomStartPositions ?? settings.randomStartPositions;
    settings.addPortToTheEyrie =
      data.addPortToTheEyrie ?? settings.addPortToTheEyrie;
    settings.victoryPointsCountNeededToWin =
      data.victoryPointsCountNeededToWin ??
      settings.victoryPointsCountNeededToWin;
    settings.loyaltyTokenCountNeededToWin =
      data.loyaltyTokenCountNeededToWin ??
      settings.loyaltyTokenCountNeededToWin;
    settings.randomVassalAssignment =
      data.randomVassalAssignment ?? settings.randomVassalAssignment;
    settings.customBalancing = data.customBalancing ?? settings.customBalancing;
    settings.houseCardsEvolution =
      data.houseCardsEvolution ?? settings.houseCardsEvolution;
    settings.houseCardsEvolutionRound =
      data.houseCardsEvolutionRound ?? settings.houseCardsEvolutionRound;
    settings.initialLiveClock =
      data.initialLiveClock ?? settings.initialLiveClock;
    settings.noPrivateChats = data.noPrivateChats ?? settings.noPrivateChats;
    settings.tournamentMode = data.tournamentMode ?? settings.tournamentMode;
    settings.fixedClock = data.fixedClock ?? settings.fixedClock;
    settings.holdVictoryPointsUntilEndOfRound =
      data.holdVictoryPointsUntilEndOfRound ??
      settings.holdVictoryPointsUntilEndOfRound;
    settings.fogOfWar = data.fogOfWar ?? settings.fogOfWar;
    settings.dragonWar = data.dragonWar ?? settings.dragonWar;
    settings.dragonRevenge = data.dragonRevenge ?? settings.dragonRevenge;
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
      thematicDraft: this.thematicDraft || undefined,
      limitedDraft: this.limitedDraft || undefined,
      randomDraft: this.randomDraft || undefined,
      perpetuumDraft: this.perpetuumDraft || undefined,
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
  thematicDraft?: boolean;
  limitedDraft?: boolean;
  randomDraft?: boolean;
  blindDraft?: boolean;
  perpetuumDraft?: boolean;
  draftMap?: boolean;
  selectedDraftDecks?: HouseCardDecks;
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
