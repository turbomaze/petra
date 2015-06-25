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
        //add user to the gameroom's players list
        //make sure there's space
        //make sure they're not already in a room

        check(roomId, String);
        check(password, String);

        var user = Meteor.user();
        var currRoom = !!user.profile ? user.profile.currentGameRoom : false;

        if (!!currRoom) {
            return {
                alreadyInRoom: true
            };
        } else {
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

        return {
            success: false
        };
    }
});