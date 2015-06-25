Meteor.publish('userData', function() {
    return Meteor.users.find({_id: this.userId}, {
        fields: {'currentGameRoom': 1}
    });
});

Meteor.publish('gameRooms', function() {
    return GameRooms.find({});
});

Meteor.publish('singleGameRoom', function(roomId) {
    check(roomId, String);
    return GameRooms.find({_id: roomId});
});