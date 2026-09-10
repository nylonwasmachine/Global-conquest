const DEFAULT_GAME_SPEED = 8;

let gameSpeed = DEFAULT_GAME_SPEED;
let gameStartedAtMs = null;
let serverNowMs = null;
let localSyncPerformance = null;

function formatGameClock(totalMinutes) {
    const minutesPerDay = 24 * 60;

    const normalized =
        ((totalMinutes % minutesPerDay) + minutesPerDay) %
        minutesPerDay;

    const hours = Math.floor(normalized / 60);
    const minutes = Math.floor(normalized % 60);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function updateGameClock() {
    const clock = document.getElementById("gameClock");

    if (!clock) {
        console.warn("Element #gameClock bestaat niet.");
        return;
    }

    if (
        gameStartedAtMs === null ||
        serverNowMs === null ||
        localSyncPerformance === null
    ) {
        clock.textContent = "00:00";
        return;
    }

    const localElapsedMs =
        performance.now() - localSyncPerformance;

    const realElapsedMs =
        (serverNowMs - gameStartedAtMs) + localElapsedMs;

    const gameElapsedMs =
        realElapsedMs * gameSpeed;

    const gameElapsedMinutes =
        gameElapsedMs / 60000;

    clock.textContent =
        formatGameClock(gameElapsedMinutes);
}

async function initializeGameClock() {
    const clock = document.getElementById("gameClock");

    if (!clock) {
        console.warn("gameClock element niet gevonden.");
        return;
    }

    if (!window.supabaseClient) {
        console.error("supabaseClient bestaat niet.");
        clock.textContent = "00:00";
        return;
    }

    try {
        const { data, error } =
            await supabaseClient.rpc("get_game_state");

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error("Geen game state ontvangen.");
        }

        const state = data[0];

        gameStartedAtMs =
            new Date(state.game_started_at).getTime();

        serverNowMs =
            new Date(state.server_now).getTime();

        const serverSpeed =
            Number(state.game_speed);

        if (
            Number.isFinite(serverSpeed) &&
            serverSpeed > 0
        ) {
            gameSpeed = serverSpeed;
        } else {
            gameSpeed = DEFAULT_GAME_SPEED;
        }

        localSyncPerformance =
            performance.now();

        updateGameClock();

        console.log("Game clock gestart.");
        console.log("Game speed:", gameSpeed);
        console.log("Game gestart:", state.game_started_at);

    } catch (error) {
        console.error(
            "Game clock kon niet starten:",
            error
        );

        clock.textContent = "00:00";
    }
}

async function resyncGameClock() {
    if (!window.supabaseClient) {
        return;
    }

    try {
        const { data, error } =
            await supabaseClient.rpc("get_game_state");

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            return;
        }

        const state = data[0];

        gameStartedAtMs =
            new Date(state.game_started_at).getTime();

        serverNowMs =
            new Date(state.server_now).getTime();

        const serverSpeed =
            Number(state.game_speed);

        if (
            Number.isFinite(serverSpeed) &&
            serverSpeed > 0
        ) {
            gameSpeed = serverSpeed;
        }

        localSyncPerformance =
            performance.now();

        updateGameClock();

    } catch (error) {
        console.error(
            "Game clock synchronisatie mislukt:",
            error
        );
    }
}


// Elke 250 ms de klok visueel bijwerken
setInterval(updateGameClock, 250);


// Elke minuut opnieuw synchroniseren met Supabase
setInterval(resyncGameClock, 60000);


// Start de klok
initializeGameClock();
