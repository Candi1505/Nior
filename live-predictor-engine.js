/* ============================================================
   CHEST COMPANION BETA
   LIVE PREDICTOR ENGINE

   Reads imported War Dragons about_v2 event data.

   This first version:
   - connects to window.currentEventData
   - reads all four chest decks
   - reports deck lengths
   - manages the selected chest type
   - refreshes automatically after a live event import

   Prediction and drop tracking will be added next.
   ============================================================ */

(function initialiseLivePredictorEngine(window) {
  "use strict";

  const STORAGE_KEY =
    "chestCompanionLivePredictor";

  const SUPPORTED_CHESTS = [
    "gold",
    "platinum",
    "draconic",
    "freedom"
  ];

  const CHEST_LABELS = {
    gold: "Gold",
    platinum: "Platinum",
    draconic: "Draconic",
    freedom: "Freedom"
  };

  let state = loadState();

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */

  function createDefaultState() {
    return {
      activeChest: "gold"
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ||
          "{}"
      );

      const activeChest =
        SUPPORTED_CHESTS.includes(
          saved.activeChest
        )
          ? saved.activeChest
          : "gold";

      return {
        ...createDefaultState(),
        ...saved,
        activeChest
      };
    } catch (error) {
      console.warn(
        "[Chest Companion] Could not restore live predictor state.",
        error
      );

      return createDefaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn(
        "[Chest Companion] Could not save live predictor state.",
        error
      );
    }
  }

  /* ----------------------------------------------------------
     IMPORTED EVENT DATA
     ---------------------------------------------------------- */

  function getEventData() {
    const data =
      window.currentEventData;

    if (
      !data ||
      typeof data !== "object"
    ) {
      return null;
    }

    return data;
  }

  function isReady() {
    const eventData =
      getEventData();

    return Boolean(
      eventData &&
      eventData.chests &&
      eventData.ready
    );
  }

  function getEventName() {
    const eventData =
      getEventData();

    const possibleName =
      eventData?.event?.name ||
      eventData?.event?.title ||
      eventData?.eventName ||
      eventData?.name ||
      eventData?.event;

    if (
      typeof possibleName === "string" &&
      possibleName.trim()
    ) {
      return possibleName.trim();
    }

    const sourceFile =
      window.currentEventSourceFile;

    if (
      typeof sourceFile === "string" &&
      sourceFile.trim()
    ) {
      return sourceFile
        .replace(/\.(txt|json)$/i, "")
        .trim();
    }

    return "Unknown Event";
  }

  function getImportedAt() {
    const eventData =
      getEventData();

    return (
      eventData?.importedAt ||
      null
    );
  }

  /* ----------------------------------------------------------
     CHEST DATA
     ---------------------------------------------------------- */

  function isSupportedChest(
    chestType
  ) {
    return SUPPORTED_CHESTS.includes(
      String(chestType || "")
        .toLowerCase()
    );
  }

  function normaliseChestType(
    chestType
  ) {
    const normalised =
      String(
        chestType ||
        state.activeChest ||
        "gold"
      )
        .trim()
        .toLowerCase();

    return isSupportedChest(
      normalised
    )
      ? normalised
      : "gold";
  }

  function setActiveChest(
    chestType
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    state.activeChest =
      normalised;

    saveState();

    window.dispatchEvent(
      new CustomEvent(
        "chest-companion-live-chest-changed",
        {
          detail: {
            chestType:
              normalised
          }
        }
      )
    );

    return normalised;
  }

  function getActiveChest() {
    return state.activeChest;
  }

  function getChestData(
    chestType =
      state.activeChest
  ) {
    const eventData =
      getEventData();

    if (
      !eventData?.chests
    ) {
      return null;
    }

    const normalised =
      normaliseChestType(
        chestType
      );

    return (
      eventData.chests[
        normalised
      ] ||
      null
    );
  }

  function findDeckArray(
    chestData
  ) {
    if (
      Array.isArray(
        chestData
      )
    ) {
      return chestData;
    }

    if (
      !chestData ||
      typeof chestData !==
        "object"
    ) {
      return [];
    }

    const possibleArrays = [
      chestData.deck,
      chestData.sequence,
      chestData.values,
      chestData.rewards,
      chestData.entries,
      chestData.data
    ];

    const match =
      possibleArrays.find(
        value =>
          Array.isArray(value)
      );

    return match || [];
  }

  function getDeck(
    chestType =
      state.activeChest
  ) {
    const chestData =
      getChestData(
        chestType
      );

    return findDeckArray(
      chestData
    );
  }

  function getDeckLength(
    chestType =
      state.activeChest
  ) {
    const chestData =
      getChestData(
        chestType
      );

    const deck =
      getDeck(
        chestType
      );

    if (deck.length) {
      return deck.length;
    }

    const possibleLength =
      Number(
        chestData?.length ??
        chestData?.deckLength ??
        0
      );

    return Number.isFinite(
      possibleLength
    )
      ? possibleLength
      : 0;
  }

  /*
   * The imported file currently reports Current as 0.
   * This is not treated as a solved player position yet.
   * The real position solver will be added after drop recording.
   */
  function getCurrentIndex(
    chestType =
      state.activeChest
  ) {
    const chestData =
      getChestData(
        chestType
      );

    if (!chestData) {
      return null;
    }

    const possibleIndex =
      chestData.currentIndex ??
      chestData.current ??
      chestData.playerIndex ??
      null;

    const numericIndex =
      Number(possibleIndex);

    return Number.isFinite(
      numericIndex
    )
      ? numericIndex
      : null;
  }

  function getFoundIndex(
    chestType =
      state.activeChest
  ) {
    const chestData =
      getChestData(
        chestType
      );

    if (!chestData) {
      return null;
    }

    const possibleIndex =
      chestData.foundIndex ??
      chestData.sourceIndex ??
      chestData.index ??
      null;

    const numericIndex =
      Number(possibleIndex);

    return Number.isFinite(
      numericIndex
    )
      ? numericIndex
      : null;
  }

  function hasChestDeck(
    chestType =
      state.activeChest
  ) {
    return (
      getDeckLength(
        chestType
      ) > 0
    );
  }

  function getChestLabel(
    chestType =
      state.activeChest
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    return (
      CHEST_LABELS[
        normalised
      ] ||
      normalised
    );
  }

  /* ----------------------------------------------------------
     STATUS
     ---------------------------------------------------------- */

  function getChestStatus(
    chestType
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    const chestData =
      getChestData(
        normalised
      );

    return {
      chestType:
        normalised,

      label:
        getChestLabel(
          normalised
        ),

      loaded:
        hasChestDeck(
          normalised
        ),

      length:
        getDeckLength(
          normalised
        ),

      foundIndex:
        getFoundIndex(
          normalised
        ),

      currentIndex:
        getCurrentIndex(
          normalised
        ),

      sourceKey:
        chestData?.key ||
        chestData?.deckKey ||
        chestData?.sourceKey ||
        ""
    };
  }

  function getStatus() {
    const eventData =
      getEventData();

    return {
      ready:
        isReady(),

      event:
        getEventName(),

      importedAt:
        getImportedAt(),

      sourceFile:
        window.currentEventSourceFile ||
        "",

      activeChest:
        getActiveChest(),

      activeChestLabel:
        getChestLabel(),

      readyChestCount:
        eventData?.readyChestCount ??
        SUPPORTED_CHESTS.filter(
          hasChestDeck
        ).length,

      chests:
        SUPPORTED_CHESTS.map(
          getChestStatus
        )
    };
  }

  /* ----------------------------------------------------------
     IMPORT REFRESH
     ---------------------------------------------------------- */

  function refresh() {
    const status =
      getStatus();

    window.dispatchEvent(
      new CustomEvent(
        "chest-companion-live-predictor-updated",
        {
          detail: status
        }
      )
    );

    return status;
  }

  window.addEventListener(
    "noir:event-imported",
    refresh
  );

  /*
   * This extra event name keeps the engine compatible
   * if event-import.js later uses the Chest Companion naming.
   */
  window.addEventListener(
    "chest-companion-event-imported",
    refresh
  );

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */

  window.LivePredictorEngine =
    Object.freeze({
      supportedChests:
        Object.freeze([
          ...SUPPORTED_CHESTS
        ]),

      isReady,
      refresh,

      getStatus,
      getEventData,
      getEventName,
      getImportedAt,

      isSupportedChest,
      setActiveChest,
      getActiveChest,
      getChestLabel,

      getChestData,
      getDeck,
      getDeckLength,
      getCurrentIndex,
      getFoundIndex,
      getChestStatus,
      hasChestDeck
    });

  console.info(
    "[Chest Companion] Live Predictor Engine ready.",
    getStatus()
  );
})(window);