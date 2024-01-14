const express = require('express');
const app = express();
const port = 8080;
//const Joi = require('joi');
bodyParser = require('body-parser').json();
const cors = require('cors');
app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "OPTIONS, GET, POST, PUT, PATCH, DELETE"
      );
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      next();
    });

players = []
config = { defaultTime: 640000 }
let gamePhase = 0;
let gameStartedAt = 0;
let gameStoppededAt = 0;

// každý hráč dostane hexa kód na "register". server zkontroluje, jestli kód už neexistuje a vytvoří hráče. Kód se zapíše do localstorage
// jakmile je v localstorage nějaký kód, react se pokusí o navázání spojení s hrou. Jakmile se povede, hráči naskočí čekací obrazovka a v jeho objektu se změní stav na waiting
// správce pozoruje registrované hráče jako seznam, Až budou všichni, spustí hru - všem hráčům nastaví čas. To bude pro react, který neustále aktualizuje objekt hráče, známka, že má zobrazit čas a funkce
// objekt hráče má i parametr vyřazen. Pokud dojde čas, server přepíše parametr na true. Pokud bude aktivní mód na teamy, bude existovat i seznam teamů a hráčů v něm. server bude kontrolovat parametr vyřazen u hráčů a přepíše ho následně celému teamu

app.get('/', (req, res) => {
    res.send("v2.1");
});



app.post('/add-me', bodyParser, (req, res) => {
    if (gamePhase === 0) {
        let x
        if (req.body.nickname === "banka") {
            x = { id: "bank", nickname: "Banka" }
        } else {
            x = addPlayer(req.body)
        }

        res.send({ id: x.id, path: "/game", nickname: x.nickname });    //React ho zapíše do localstorage 
    } else {
        res.send({});
    }
});

app.post('/player-exist', bodyParser, (req, res) => { // kontrola při přihlašování
    res.send(players.some(obj => obj.id === req.body.id));
});

function addPlayer(body) {
    let nick = body.nickname
    //for (let i =0; i < 10; i++) {
    let randomHexa;
    do {
        randomHexa = Math.floor(Math.random() * 256).toString(16).padStart(2, '0') + "";
    } while (players.some(object => object.id === randomHexa));
    if (!nick)
        nick = "hrac"

    players.push({ id: randomHexa, nickname: nick, time: 0, sentTime: 0 });

    return ({ id: randomHexa, nickname: nick })
}


app.post('/game', bodyParser, (req, res) => {
    res.send({ "gamePhase": gamePhase, "gameStartedAt": gameStartedAt, "players": players.length, "me": players.find(object => object.id === req.body.id) })

});


app.post('/send-time', bodyParser, (req, res) => {    let myId = req.body.myId
    let targetId = req.body.targetId
    let myId1 = req.body.myId
    let myTime
    let targetTime = getTimeById(players, targetId) - Date.now()
    let sendTime = req.body.quantityOdTime * 60000
    if ((sendTime > 0) && (targetTime > 0)) {
        if (myId !== "bank") { // pokud posílá hráč
            myTime = getTimeById(players, myId1) - Date.now() // zjisti můj čas
            if ((myTime > sendTime) && (myId1 !== targetId)) { // mám dost času?
                players = performTimeOperation(players, myId, sendTime, "minus")
                players = performTimeOperation(players, targetId, sendTime, "plus")
            }
        } else { // pokud banka
            players = performTimeOperation(players, targetId, sendTime, "plus")
        }
    }
    res.send(req.body)
});

app.post('/my-result', bodyParser, (req, res) => {
    res.send({ "me": players.find(object => object.id === req.body.id) }) // statistiky
}
);

function getTimeById(array, targetId) {
    const foundObject = array.find(obj => obj.id === targetId);

    return foundObject ? foundObject.time : null;
}

// ADMIN -------------------------------------------------------------- ADMIN
app.get('/admin-players', (req, res) => {
    res.send({ "players": players, "gamePhase": gamePhase, "gameStoppededAt": gameStoppededAt });
    
});
app.get('/admin-stuff', (req, res) => {
    res.send({ "defaultTime": config.defaultTime, "gameStartedAt": gameStartedAt, "gamePhase": gamePhase });
});

app.get('/admin-start', (req, res) => {
    if (gamePhase === 0) {
        gamePhase = 1
        gameStartedAt = Date.now()
        players = setAllPlayersTime(players, config.defaultTime)
    }
    res.send({});
});

app.get('/admin-stop', (req, res) => {
    if (gamePhase === 1) {
        gamePhase = 2
        gameStoppededAt = Date.now()
    }
    res.send({});
});
app.get('/admin-new', bodyParser, (req, res) => {
    players = []
    gamePhase = 0
    gameStartedAt = 0
    gameStoppededAt = 0
    res.send({})

});


function setAllPlayersTime(obj, newTimeValue) {
    return obj.map(obj => ({ ...obj, time: Date.now() + newTimeValue }))
}

function performTimeOperation(array, targetId, number, operator) {
    const modifiedArray = array.map(obj => {
        if (obj.id === targetId) {
            if (operator === 'plus') {
                return { ...obj, time: obj.time + number };
            } else if (operator === 'minus') {
                return { ...obj, time: obj.time - number, sentTime: obj.sentTime + number / 60000 };
            }
        }
        return obj;
    });

    return modifiedArray;
}

// funkce vytvoří kopii pole hráčů, ale změní vlastnosti čas na pevné hodnoty. Reactu se bude muset říct, aby od hodnot neodečítal Date.now(). Ta se použije k vyhodnocení

app.listen(port, () => console.log("Listening on port " + port + "..."));


