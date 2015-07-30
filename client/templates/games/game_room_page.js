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

        Meteor.call('startGame', this._id, function(err, result) {
            if (err) return Errors.throw(err.reason);

            if (result.success) {
                //ga
                ga('send', 'event', 'game', 'start');
            }
        });
    },
    'click .delete': function(e, tmpl) {
        e.preventDefault();

        Meteor.call('deleteGameRoom', this._id, function(err, result) {
            if (err) return Errors.throw(err.reason);

            if (result.notRoomOwner) {
                return Errors.throw(
                    'Only the room owner can delete this room.'
                );
            } else if (result.success) {
                //ga
                ga('send', 'event', 'game', 'delete');

                Router.go('home');
            }
        });
    }
});