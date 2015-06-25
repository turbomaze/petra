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
            players: [user._id],
            open: true,
            createdAt: new Date()
        });
        var gameRoomId = GameRooms.insert(gameRoom);
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
                GameRooms.update({_id: roomId}, {
                    $addToSet: {
                        players: Meteor.userId()
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
        console.log('did it!');
        if (!!Meteor.userId()) {
            //logged in
            var user = Meteor.user();
            var currRoom = !!user.profile ? user.profile.currentGameRoom : false;
            //if they're in a room already
            if (!!currRoom) {
                //remove them from the room's player list
                GameRooms.update({_id: currRoom}, {
                    $pullAll: {
                        players: [Meteor.userId()]
                    }
                });

                //get rid of their currentGameRoom property
                Meteor.users.update({_id: Meteor.userId()}, {
                    $set: {'profile.currentGameRoom': false}
                });

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