isInGameRoom = function(roomId) {
    //be careful about denormalization here
    if (!!Meteor.userId()) {
        var players = GameRooms.findOne({_id: roomId}, {
            fields: {players: 1}
        }).players;
        var playerIds = players.map(function(player) {
            return player._id;
        });

        if (playerIds.indexOf(Meteor.userId()) !== -1) {
            //they're in the game's players' array
            return true;
        } else return false; //they're not
    } else {
        return false; //logged out means they're not in a room
    }
};

isRoomOwner = function(gameRoom) {
    return Meteor.userId() && Meteor.userId() === gameRoom.userId;
};