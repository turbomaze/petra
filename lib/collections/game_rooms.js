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

        /* TODO: fix the never-empty room problem
         * make sure you add this gameRoomId to the user as well
         * otherwise their auth is incomplete and inconsistent
         * with the rest of the app
         */
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
                GameRooms.update({_id: currRoom}, {
                    $pullAll: {
                        players: [{
                            _id: Meteor.userId(),
                            username: Meteor.user().username
                        }]
                    }
                });

                //check to see if the room is then empty
                var players = GameRooms.findOne({_id: currRoom}).players;
                if (players.length === 0) {
                    //their leaving the room made it empty
                    GameRooms.remove({_id: currRoom}); //so delete the room
                } else {
                    //if the room isn't empty, choose a new owner
                    var newOwner = players[0];
                    GameRooms.update({_id: currRoom}, {
                        $set: {
                            userId: newOwner._id,
                            author: newOwner.username
                        }
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
            var numTiles = 100;
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
                    tiles: tiles
                }
            });
        } else {
            return {
                notRoomOwner: true
            };
        }
    }
});

function getRandKeyFromCountSet(countSet, key) {
    var keys = Object.keys(countSet);
    var key = keys[Math.floor(keys.length*Math.random())];
    if (countSet[key] === 1) {
        delete countSet[key];
    } else {
        countSet[key] -= 1;
    }
    return key;
}