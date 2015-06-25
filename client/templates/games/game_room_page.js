var isRoomOwner = function(gameRoom) {
    return Meteor.userId() && Meteor.userId() === gameRoom.userId;
};

Template.gameRoomPage.helpers({
    isRoomOwner: function() {
        return isRoomOwner(this);
    },
    normalPlayers: function() {
        var ownerId = this.userId;
        return this.players.filter(function(player) {
            console.log('-------------------');
            console.log(ownerId);
            console.log(Meteor.userId());
            console.log('-------------------');
            //as long as they're not the author
            return player._id !== ownerId;
        });
    }
});

Template.gameRoomPage.events({
    'click .delete': function(e, tmpl) {
        e.preventDefault();

        if (isRoomOwner(this)) {
            GameRooms.remove(this._id);
            Router.go('home');
        }
    }
});