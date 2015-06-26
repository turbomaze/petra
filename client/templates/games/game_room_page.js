var isRoomOwner = function(gameRoom) {
    return Meteor.userId() && Meteor.userId() === gameRoom.userId;
};

Template.gameRoomPage.helpers({
    isRoomOwner: function() {
        return isRoomOwner(this);
    },
    normalPlayers: function() {
        var ownerId = this.userId;
        var nonOwners = this.players.filter(function(player) {
            //as long as they're not the author
            return player._id !== ownerId;
        });
        return nonOwners;
    }
});

Template.gameRoomPage.events({
    'click .start': function(e, tmpl) {
        e.preventDefault();

        Meteor.call('startGame', this._id);
    },
    'click .delete': function(e, tmpl) {
        e.preventDefault();

        if (isRoomOwner(this)) { //
            GameRooms.remove(this._id);
            Router.go('home');
        }
    }
});