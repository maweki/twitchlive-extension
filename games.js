const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Api = Extension.imports.api;

const GAMES_CACHE = [];

function get(session, gameIds) {
    const results = [];
    return new Promise((resolve, reject) => {
        if (gameIds.length === 0) {
            return resolve(results);
        }
        for (let i = 0; i < gameIds.length; i += 1) {
            const gameId = gameIds[i];
            if (GAMES_CACHE[gameId]) {
                // added cached to results array
                results.push(GAMES_CACHE[gameId]);
                // remove cached from gameIds
                gameIds.splice(i, 1);
            }
        }
        let promise = null;
        if (gameIds.length > 0) {
            promise = Api.games(session, gameIds).then((data) => {
                data.forEach((game) => {
                    results.push(game);
                    // zikeji: could probably reduce memory impact slightly be removing the game thumbnail but this may be used later
                    GAMES_CACHE[game.id] = game;
                });
            }).catch((errors) => {
                log("caught error: " + errors[0].error);
            });
        }
        if (!promise) {
            return resolve(results);
        }
        Promise.all([promise]).then(() => {
            resolve(results);
        });
    });
}

function getFromStreams(session, streams) {
    // map streams to an array of game ids where the stream has a valid game id
    let gameIds = streams.filter((stream) => stream.game_id && stream.game_id > 0).map((stream) => stream.game_id);
    // remove duplicates
    gameIds = gameIds.filter((item, pos) => gameIds.indexOf(item) == pos);
    return get(session, gameIds);
}
