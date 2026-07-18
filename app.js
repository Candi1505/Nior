/* =========================================================
   CHEST COMPANION V2
   Complete Main Application

   Built by Cherubim
   Artwork by Eff
========================================================= */

(() => {

  "use strict";


  /* =======================================================
     APP SETTINGS
  ======================================================= */

  const STORAGE_KEY =
    "chest_companion_v2";


  const CLOUD_TIMEOUT_MS =
    7000;


  const DEFAULT_STATE = {

    profile: {

      nickname:
        "Tester",

      alliance_name:
        "",

      favourite_chest:
        ""

    },

    activeSession:
      null,

    history:
      [],

    priorities: {

      gold:
        {},

      platinum:
        {}

    }

  };


  /*
    These temporary rewards allow the app to open and function
    even before the complete Gold and Platinum tables are loaded.
  */

  const FALLBACK_DATA = {

    gold: {

      rewards: [

        {

          id:
            "gold-crystals",

          name:
            "Crystals",

          quantity:
            "",

          rarity:
            "epic"

        },

        {

          id:
            "gold-breeding-tokens",

          name:
            "Breeding Tokens",

          quantity:
            "",

          rarity:
            "legendary"

        },

        {

          id:
            "gold-elemental-shards",

          name:
            "Elemental Shards",

          quantity:
            "",

          rarity:
            "epic"

        },

        {

          id:
            "gold-food",

          name:
            "Food",

          quantity:
            "",

          rarity:
            "epic"

        },

        {

          id:
            "gold-lumber",

          name:
            "Lumber",

          quantity:
            "",

          rarity:
            "epic"

        }

      ],

      sequence:
        []

    },


    platinum: {

      rewards: [

        {

          id:
            "platinum-crystals",

          name:
            "Crystals",

          quantity:
            "",

          rarity:
            "legendary"

        },

        {

          id:
            "platinum-breeding-tokens",

          name:
            "Breeding Tokens",

          quantity:
            "",

          rarity:
            "mythic"

        },

        {

          id:
            "platinum-elemental-shards",

          name:
            "Elemental Shards",

          quantity:
            "",

          rarity:
            "legendary"

        },

        {

          id:
            "platinum-food",

          name:
            "Food",

          quantity:
            "",

          rarity:
            "epic"

        },

        {

          id:
            "platinum-lumber",

          name:
            "Lumber",

          quantity:
            "",

          rarity:
            "epic"

        }

      ],

      sequence:
        []

    }

  };


  /* =======================================================
     APP STATE
  ======================================================= */

  let appState =
    loadLocalState();


  let currentUser =
    null;


  let currentChest =
    appState.activeSession?.chest ||
    "gold";


  let eventsBound =
    false;


  /* =======================================================
     DOM HELPERS
  ======================================================= */

  const getElement =
    (id) =>
      document.getElementById(id);


  const getAllElements =
    (selector) =>
      Array.from(
        document.querySelectorAll(
          selector
        )
      );


  function setText(
    element,
    value
  ) {

    if (!element) {

      return;

    }


    element.textContent =
      String(
        value ?? ""
      );

  }


  /* =======================================================
     GENERAL HELPERS
  ======================================================= */

  function cloneValue(
    value
  ) {

    return JSON.parse(
      JSON.stringify(
        value
      )
    );

  }


  function capitalise(
    value
  ) {

    const text =
      String(
        value || ""
      );


    if (!text) {

      return "";

    }


    return (
      text.charAt(0)
        .toUpperCase() +
      text.slice(1)
    );

  }


  function escapeHtml(
    value
  ) {

    return String(
      value ?? ""
    ).replace(
      /[&<>"']/g,
      (character) => ({

        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        "\"":
          "&quot;",

        "'":
          "&#039;"

      })[character]
    );

  }


  function createUniqueId() {

    if (
      window.crypto &&
      typeof window.crypto
        .randomUUID ===
        "function"
    ) {

      return window.crypto
        .randomUUID();

    }


    return (

      Date.now()
        .toString(36) +

      "-" +

      Math.random()
        .toString(36)
        .slice(2)

    );

  }


  function formatDate(
    value
  ) {

    try {

      return new Intl
        .DateTimeFormat(
          "en-AU",
          {

            dateStyle:
              "medium",

            timeStyle:
              "short"

          }
        )
        .format(
          new Date(value)
        );

    } catch (error) {

      return String(
        value || ""
      );

    }

  }


  function withTimeout(
    promise,
    milliseconds =
      CLOUD_TIMEOUT_MS
  ) {

    return Promise.race([

      promise,

      new Promise(
        (
          resolve,
          reject
        ) => {

          window.setTimeout(
            () => {

              reject(
                new Error(
                  "Cloud connection timed out."
                )
              );

            },
            milliseconds
          );

        }
      )

    ]);

  }


  /* =======================================================
     LOCAL STORAGE
  ======================================================= */

  function loadLocalState() {

    try {

      const savedState =
        JSON.parse(

          localStorage.getItem(
            STORAGE_KEY
          ) ||

          "{}"

        );


      return {

        ...cloneValue(
          DEFAULT_STATE
        ),

        ...savedState,

        profile: {

          ...DEFAULT_STATE.profile,

          ...(
            savedState.profile ||
            {}
          )

        },

        priorities: {

          gold:
            savedState
              .priorities
              ?.gold ||
            {},

          platinum:
            savedState
              .priorities
              ?.platinum ||
            {}

        },

        history:
          Array.isArray(
            savedState.history
          )
            ? savedState.history
            : []

      };

    } catch (error) {

      console.error(
        "Chest Companion could not load local data:",
        error
      );


      return cloneValue(
        DEFAULT_STATE
      );

    }

  }


  function saveLocalState() {

    try {

      localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(
          appState
        )

      );

    } catch (error) {

      console.error(
        "Chest Companion could not save local data:",
        error
      );

    }

  }


  /* =======================================================
     CHEST DATA HELPERS
  ======================================================= */

  function normaliseReward(
    reward,
    index = 0,
    chestType =
      currentChest
  ) {

    if (
      typeof reward ===
      "string"
    ) {

      return {

        id:
          reward,

        name:
          reward,

        quantity:
          "",

        rarity:
          "epic"

      };

    }


    return {

      id:
        String(

          reward?.id ||

          reward?.key ||

          reward?.slug ||

          `${chestType}-reward-${index}`

        ),

      name:
        String(

          reward?.name ||

          reward?.reward ||

          reward?.label ||

          "Unknown reward"

        ),

      quantity:
        String(

          reward?.quantity ??

          reward?.amount ??

          reward?.value ??

          ""

        ),

      rarity:
        String(

          reward?.rarity ||

          "epic"

        )
          .toLowerCase()

    };

  }


  function getRawChestData(
    chestType =
      currentChest
  ) {

    if (
      window.CHEST_DATA?.[
        chestType
      ]
    ) {

      return window
        .CHEST_DATA[
          chestType
        ];

    }


    if (
      chestType ===
        "gold" &&
      window.GOLD_CHEST_DATA
    ) {

      return window
        .GOLD_CHEST_DATA;

    }


    if (
      chestType ===
        "platinum" &&
      window.PLATINUM_CHEST_DATA
    ) {

      return window
        .PLATINUM_CHEST_DATA;

    }


    return FALLBACK_DATA[
      chestType
    ];

  }


  function getRewards(
    chestType =
      currentChest
  ) {

    const chestData =
      getRawChestData(
        chestType
      );


    const rewardList =

      chestData?.rewards ||

      chestData?.drops ||

      chestData?.items ||

      [];


    const normalisedRewards =
      rewardList.map(
        (
          reward,
          index
        ) =>
          normaliseReward(
            reward,
            index,
            chestType
          )
      );


    if (
      normalisedRewards.length
    ) {

      return normalisedRewards;

    }


    return FALLBACK_DATA[
      chestType
    ].rewards.map(
      (
        reward,
        index
      ) =>
        normaliseReward(
          reward,
          index,
          chestType
        )
    );

  }


  function getSequence(
    chestType =
      currentChest
  ) {

    const chestData =
      getRawChestData(
        chestType
      );


    const sequenceList =

      chestData?.sequence ||

      chestData?.fullSequence ||

      chestData?.table ||

      [];


    return sequenceList.map(
      (
        entry,
        index
      ) =>
        normaliseReward(
          entry,
          index,
          chestType
        )
    );

  }


  function rewardsMatch(
    firstReward,
    secondReward
  ) {

    if (
      !firstReward ||
      !secondReward
    ) {

      return false;

    }


    const firstId =
      String(
        firstReward.id ||
        ""
      )
        .trim()
        .toLowerCase();


    const secondId =
      String(
        secondReward.id ||
        ""
      )
        .trim()
        .toLowerCase();


    if (
      firstId &&
      secondId &&
      firstId === secondId
    ) {

      return true;

    }


    const firstName =
      String(
        firstReward.name ||
        ""
      )
        .trim()
        .toLowerCase();


    const secondName =
      String(
        secondReward.name ||
        ""
      )
        .trim()
        .toLowerCase();


    const firstQuantity =
      String(
        firstReward.quantity ||
        ""
      )
        .trim()
        .toLowerCase();


    const secondQuantity =
      String(
        secondReward.quantity ||
        ""
      )
        .trim()
        .toLowerCase();


    return (

      firstName ===
        secondName &&

      (
        !firstQuantity ||

        !secondQuantity ||

        firstQuantity ===
          secondQuantity
      )

    );

  }


  function resolveSequenceReward(
    sequenceEntry
  ) {

    return (

      getRewards()
        .find(
          (reward) =>
            rewardsMatch(
              reward,
              sequenceEntry
            )
        ) ||

      sequenceEntry

    );

  }


  /* =======================================================
     LOADING AND CLOUD STATUS
  ======================================================= */

  function updateCloudBadge(
    message,
    online =
      false
  ) {

    const cloudBadge =
      getElement(
        "cloudBadge"
      );


    if (!cloudBadge) {

      return;

    }


    cloudBadge.textContent =
      message;


    cloudBadge.classList.toggle(
      "online",
      online
    );

  }


  function openApplicationShell() {

    getElement(
      "loadingScreen"
    )?.classList.add(
      "hidden"
    );


    getElement(
      "appShell"
    )?.classList.remove(
      "hidden"
    );

  }


  async function startApplication() {

    bindEvents();

    loadProfileIntoScreen();

    renderHomeScreen();


    updateCloudBadge(
      "Connecting...",
      false
    );


    setText(

      getElement(
        "loadingStatus"
      ),

      "Connecting to the Crystal Nexus..."

    );


    try {

      if (
        !window
          .ChestDatabase
          ?.initialisePlayer
      ) {

        throw new Error(
          "Database tools are unavailable."
        );

      }


      const player =
        await withTimeout(

          window
            .ChestDatabase
            .initialisePlayer()

        );


      currentUser =
        player?.user ||
        null;


      if (
        player?.profile
      ) {

        appState.profile = {

          nickname:

            player
              .profile
              .nickname ||

            appState
              .profile
              .nickname ||

            "Tester",

          alliance_name:

            player
              .profile
              .alliance_name ||

            appState
              .profile
              .alliance_name ||

            "",

          favourite_chest:

            player
              .profile
              .favourite_chest ||

            appState
              .profile
              .favourite_chest ||

            ""

        };


        saveLocalState();

      }


      updateCloudBadge(
        "Cloud connected",
        true
      );


      setText(

        getElement(
          "loadingStatus"
        ),

        "✓ Connected"

      );

    } catch (error) {

      console.warn(
        "Chest Companion is opening in device mode:",
        error
      );


      updateCloudBadge(
        "Device mode",
        false
      );


      setText(

        getElement(
          "loadingStatus"
        ),

        "Cloud unavailable — opening device mode"

      );

    } finally {

      loadProfileIntoScreen();

      renderHomeScreen();


      window.setTimeout(
        () => {

          openApplicationShell();

        },
        500
      );

    }

  }
  