if (Meteor.isServer) {
    function removeJoinAuth(userId, username, roomId) {
        //get rid of their currentGameRoom property
        Meteor.users.update({_id: userId}, {
            $set: {
                'profile.currentGameRoom': false,
                'profile.leftAt': false
            }
        });

        //remove them from the room's player list
        var gameRoom = GameRooms.findOne(roomId);
        var idxInPlayers = false;
        if (!gameRoom.open) {
            idxInPlayers = gameRoom.players.reduce(
                function(ret, player, idx) {
                    return gameRoom.turn === player._id ? idx : ret;
                }, false
            );
        } //for the purposes of seeing whose turn it is
        GameRooms.update({_id: roomId}, {
            $pullAll: {
                players: [{
                    _id: userId,
                    username: username
                }]
            }
        });

        //check to see if the room is then empty
        gameRoom = GameRooms.findOne({_id: roomId}); //updated
        var players = gameRoom.players;
        if (players.length === 0) {
            //their leaving the room made it empty
            GameRooms.remove({_id: roomId}); //so delete the room
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
                if (gameRoom.turn === userId) {
                    //find out who's going next
                    var idNextPlayer = players[idxInPlayers]._id;
                    updateObj.turn = idNextPlayer;
                }

                //put their rack letters back in the bag
                var letterBag = gameRoom.letterBag;
                var rackLetters = gameRoom.playerRacks[
                    userId
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
            fieldsToUnset['playerRacks.'+userId] = '';
            GameRooms.update({_id: roomId}, {
                $set: updateObj,
                //delete their rack
                $unset: fieldsToUnset
            });
        }
    }

    var graceTime = 10*1000; //how long people can leave rooms for
    Meteor.startup(function() {
        Meteor.setInterval(function() {
            var rooms = GameRooms.find().fetch();
            rooms.map(function(room) {
                room.players.map(function(player) {
                    return player._id;
                }).map(function(userId) {
                    var user = Meteor.users.findOne(userId);
                    var currRoom = user.profile.currentGameRoom;
                    var timeSinceLeave = +new Date() - user.profile.leftAt;
                    if (currRoom !== room._id && timeSinceLeave > graceTime) {
                        //their current room doesn't match this one, so
                        //remove them from this one
                        removeJoinAuth(
                            userId,
                            user.username,
                            room._id
                        );
                    }
                });
            });
        }, graceTime/3);
    });
}