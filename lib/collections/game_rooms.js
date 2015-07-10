GameRooms = new Meteor.Collection('gameRooms')

Meteor.methods({
    'addGameRoom': function(gameRoomInfo) {
        check(Meteor.userId(), String);
        check(gameRoomInfo, {
            title: String,
            maxPlayers: Number,
            password: String,
            passwordProtected: Boolean
        });

        var user = Meteor.user();
        var gameRoom = _.extend(gameRoomInfo, {
            userId: user._id,
            author: user.username,
            players: [{
                _id: user._id,
                username: user.username
            }],
            open: true,
            createdAt: new Date()
        });

        var gameRoomId = GameRooms.insert(gameRoom);
        Meteor.users.update({_id: Meteor.userId()}, {
            $set: {'profile.currentGameRoom': gameRoomId}
        });

        return {
            _id: gameRoomId
        }
    },

    'joinGameRoom': function(roomId, password) {
        check(roomId, String);
        check(password, String);

        var user = Meteor.user();
        var currRoomId = !!user.profile ? user.profile.currentGameRoom : false;

        if (!!currRoomId) {
            return {
                alreadyInRoom: true
            };
        } else {
            var gameRoom = GameRooms.findOne({_id: roomId});
            if (gameRoom.players.length >= gameRoom.maxPlayers) {
                return {
                    isAtCapacity: true
                };
            } else if (!gameRoom.open) {
                return {
                    alreadyStarted: true
                }
            } else if (password !== gameRoom.password) {
                return {
                    wrongPassword: true
                };
            } else {
                //not at capacity, not already in a room, correct password
                //so they're good to go!
                GameRooms.update({_id: roomId}, {
                    $addToSet: {
                        players: {
                            _id: Meteor.userId(),
                            username: Meteor.user().username
                        }
                    }
                });

                Meteor.users.update({_id: Meteor.userId()}, {
                    $set: {'profile.currentGameRoom': roomId}
                });

                return {
                    success: true
                }
            }
        }
    },

    'removeJoinAuth': function() {
        if (!!Meteor.userId()) {
            //logged in
            var user = Meteor.user();
            var currRoom = !!user.profile ? user.profile.currentGameRoom : false;
            //if they're in a room already
            if (!!currRoom) {
                //get rid of their currentGameRoom property
                Meteor.users.update({_id: Meteor.userId()}, {
                    $set: {'profile.currentGameRoom': false}
                });

                //remove them from the room's player list
                var gameRoom = GameRooms.findOne(currRoom);
                var idxInPlayers = false;
                if (!gameRoom.open) {
                    idxInPlayers = gameRoom.players.reduce(
                        function(ret, player, idx) {
                            return gameRoom.turn === player._id ? idx : ret;
                        }, false
                    );
                } //for the purposes of seeing whose turn it is
                GameRooms.update({_id: currRoom}, {
                    $pullAll: {
                        players: [{
                            _id: Meteor.userId(),
                            username: Meteor.user().username
                        }]
                    }
                });

                //check to see if the room is then empty
                gameRoom = GameRooms.findOne({_id: currRoom}); //updated
                var players = gameRoom.players;
                if (players.length === 0) {
                    //their leaving the room made it empty
                    GameRooms.remove({_id: currRoom}); //so delete the room
                } else {
                    //not empty so choose a new owner
                    var newOwner = players[0];
                    var updateObj = {
                        userId: newOwner._id,
                        author: newOwner.username
                    };

                    //if the game is going on, do some damage control
                    if (!gameRoom.open) {
                        //if it was their turn and they left early
                        if (gameRoom.turn === Meteor.userId()) {
                            //find out who's going next
                            var idNextPlayer = players[idxInPlayers]._id;
                            updateObj.turn = idNextPlayer;
                        }

                        //put their rack letters back in the bag
                        var letterBag = gameRoom.letterBag;
                        var rackLetters = gameRoom.playerRacks[
                            Meteor.userId()
                        ].map(function(rackItem) {
                            return rackItem.letter;
                        });
                        rackLetters.map(function(letter) {
                            if (letter === false) return;
                            else {
                                if (letterBag.hasOwnProperty(letter)) {
                                    letterBag[letter] += 1;
                                } else {
                                    letterBag[letter] = 1;
                                }
                            }
                        });
                        updateObj.letterBag = letterBag;
                    }

                    //make the update
                    var fieldsToUnset = {};
                    fieldsToUnset['playerRacks.'+Meteor.userId()] = '';
                    GameRooms.update({_id: currRoom}, {
                        $set: updateObj,
                        //delete their rack
                        $unset: fieldsToUnset
                    });
                }

                return true;
            } else {
                //they're not in a game room; success
                return true;
            }
        } else {
            //they're logged out so no removal is needed; success
            return true;
        }

        return false;
    },

    'startGame': function(roomId) {
        check(roomId, String);

        var gameRoom = GameRooms.findOne(roomId);
        if (gameRoom.userId === Meteor.userId()) {
            //the bag of letters all games start with
            var letterBag = {
                'e': 12,
                'a': 9, 'i': 9,
                'o': 8,
                'n': 6, 'r': 6, 't': 6,
                'l': 4, 's': 4, 'u': 4, 'd': 4,
                'g': 3,
                'b': 2, 'c': 2, 'm': 2, 'p': 2, 'f': 2,
                'h': 2, 'v': 2, 'w': 2, 'y': 2,
                'k': 1, 'j': 1, 'x': 1, 'q': 1, 'z': 1
            };

            //get everyone's initial racks
            var ltrsPerRack = 7;
            var playerRacks = {};
            for (var pi = 0;
                 pi < gameRoom.players.length; pi++) {
                var rack = [];
                for (var ai = 0; ai < ltrsPerRack; ai++) {
                    rack.push({
                        _id: ai,
                        letter: getRandKeyFromCountSet(
                            letterBag
                        )
                    });
                }
                playerRacks[gameRoom.players[pi]._id] = rack;
            }

            //prepare the tiles array
            var numTiles = 15*15;
            var tiles = [];
            for (var ai = 0; ai < numTiles; ai++) {
                tiles.push({
                    _id: ai,
                    letter: false,
                    userId: false
                });
            }

            //then they're the owner
            GameRooms.update(roomId, {
                $set: {
                    open: false,
                    letterBag: letterBag,
                    playerRacks: playerRacks,
                    tiles: tiles,
                    turn: gameRoom.userId //owner goes first
                }
            });
        } else {
            return {
                notRoomOwner: true
            };
        }
    },

    'makeMove': function(roomId, tilePlacements) {
        check(roomId, String);
        check(tilePlacements, [Match.Any]);

        //find out if they're even in this room
        var gameRoom = GameRooms.findOne(roomId);
        var playerIds = GameRooms.findOne({_id: roomId}, {
            fields: {players: 1}
        }).players.map(function(player) {
            return player._id;
        });

        //make sure they're in this room
        if (playerIds.indexOf(Meteor.userId()) === -1) {
            return {
                notInRoom: true
            };
        }

        //make sure it's their turn
        if (gameRoom.turn !== Meteor.userId()) {
            return {
                notTheirTurn: true
            }
        }

        //make sure all their rack letters are valid
        var rack = gameRoom.playerRacks[Meteor.userId()];
        for (var ai = 0; ai < tilePlacements.length; ai++) {
            var rackId = tilePlacements[ai][1];
            if (rackId < 0 || rackId >= rack.length || !rack[rackId].letter) {
                return {
                    invalidRackId: true
                };
            }
        }

        //and all their tile selections
        var tiles = gameRoom.tiles;
        for (var ai = 0; ai < tilePlacements.length; ai++) {
            var tileId = tilePlacements[ai][0];
            if (tileId < 0 || tileId >= tiles.length ||
                !!tiles[tileId].letter) {
                return {
                    invalidTileId: true
                };
            }
        }

        //placements must be in a horizontal or vertical line
        if (false) {
            return {
                notALine: true
            };
        }

        //the immediate line and all sublines must be words
        if (false) {
            var invalidWords = ['work', 'in', 'progress'];
            return {
                notAWord: invalidWords
            }
        }

        //calculate the number of points they get
        var points = 0;

        //make the changes to the local tiles and racks objects
        for (var ai = 0; ai < tilePlacements.length; ai++) {
            var tileId = tilePlacements[ai][0];
            var rackId = tilePlacements[ai][1];
            tiles[tileId].letter = rack[rackId].letter;
            tiles[tileId].userId = Meteor.userId();

            //get a new letter for this user
            var letterBag = gameRoom.letterBag;
            var newLetter = getRandKeyFromCountSet(letterBag);
            if (newLetter) {
                rack[rackId] = {_id: rackId, letter: newLetter};
            }
        }

        //advance the turn to the next player
        var idxInPlayers = gameRoom.players.reduce(function(ret, player, idx) {
            return gameRoom.turn === player._id ? idx : ret;
        }, false);
        var idxNextPlayer = (idxInPlayers+1)%gameRoom.players.length;
        var nextTurn = gameRoom.players[idxNextPlayer]._id;

        //make the updates
        var propsToUpdate = {
            letterBag: letterBag,
            tiles: tiles,
            turn: nextTurn
        };
        propsToUpdate['playerRacks.'+Meteor.userId()] = rack;
        GameRooms.update(roomId, {
            $set: propsToUpdate
        });

        return {
            success: true
        };
    }
});

function getRandKeyFromCountSet(countSet) {
    var keys = Object.keys(countSet);
    if (keys.length === 0) return false;
    else {
        var key = keys[Math.floor(keys.length * Math.random())];
        if (countSet[key] === 1) {
            delete countSet[key];
        } else {
            countSet[key] -= 1;
        }
        return key;
    }
}