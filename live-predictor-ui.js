/* ============================================================
   CHEST COMPANION BETA
   LIVE PREDICTOR UI

   ============================================================ */

(function initialiseLivePredictorUI(window) {
    "use strict";

    const Engine = window.LivePredictorEngine;

    if (!Engine) {
        console.error(
            "[Chest Companion] live-predictor-engine.js not loaded."
        );
        return;
    }

    function addStyles() {

        if (document.getElementById("livePredictorStyles")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "livePredictorStyles";

        style.textContent = `

#livePredictor {

    position: fixed;
    inset: 0;

    background:#050505;

    color:#d7d7d7;

    z-index:999999;

    display:none;

    overflow:auto;

    font-family:Inter,sans-serif;

}

#livePredictor.open{

    display:block;

}

.lp-shell{

    max-width:700px;

    margin:30px auto;

    padding:20px;

}

.lp-card{

    background:#111;

    border:1px solid #292929;

    border-radius:18px;

    padding:18px;

    margin-bottom:16px;

}

.lp-card h2{

    margin-top:0;

    color:#d9bf76;

}

.lp-grid{

    display:grid;

    grid-template-columns:repeat(2,1fr);

    gap:12px;

}

.lp-item{

    background:#181818;

    border-radius:12px;

    padding:14px;

}

.lp-item strong{

    display:block;

    color:#fff;

}

.lp-close{

    width:100%;

    padding:14px;

    margin-top:20px;

    border:none;

    border-radius:14px;

    background:#d9bf76;

    color:#000;

    font-weight:bold;

    cursor:pointer;

}

`;
        document.head.appendChild(style);

    }

    function createUI() {

        if (document.getElementById("livePredictor")) {
            return;
        }

        const ui = document.createElement("div");

        ui.id = "livePredictor";

        ui.innerHTML = `

<div class="lp-shell">

<div class="lp-card">

<h2>Live Event Predictor</h2>

<div id="lpEvent"></div>

</div>

<div class="lp-card">

<h2>Chest Decks</h2>

<div
id="lpDecks"
class="lp-grid">
</div>

</div>

<button
class="lp-close"
id="lpClose">

Close

</button>

</div>

`;

        document.body.appendChild(ui);

    }

    function render() {

        const status =
            Engine.getStatus();

        document.getElementById(
            "lpEvent"
        ).innerHTML = `

<strong>Event</strong>

${status.event}

<br><br>

<strong>Status</strong>

${status.ready ? "🟢 Ready" : "🔴 Not Ready"}

`;

        document.getElementById(
            "lpDecks"
        ).innerHTML = status.chests.map(

            chest => `

<div class="lp-item">

<strong>

${chest.chest.toUpperCase()}

</strong>

Deck Length

<br>

${chest.length}

<br><br>

Current Index

<br>

${chest.index}

</div>

`

        ).join("");

    }

    function open() {

        render();

        document
            .getElementById(
                "livePredictor"
            )
            .classList.add("open");

    }

    function close() {

        document
            .getElementById(
                "livePredictor"
            )
            .classList.remove("open");

    }

    function initialise() {

        addStyles();

        createUI();

        document
            .getElementById("lpClose")
            .addEventListener(
                "click",
                close
            );

        console.info(
            "[Chest Companion] Live Predictor UI ready."
        );

    }

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialise
        );

    } else {

        initialise();

    }

    window.LivePredictorUI = Object.freeze({

        open,

        close,

        render

    });

})(window);