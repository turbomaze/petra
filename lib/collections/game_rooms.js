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
        //add user to the game room's players list
        //make sure there's space
        //make sure they're not already in a room

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
            } else if (password !== gameRoom.password) {
                return {
                    wrongPassword: true
                };
            } else {
                //not at capacity, not already in a room, correct password
                //  so they're good to go!
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
    }
});