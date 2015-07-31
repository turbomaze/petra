Template.gamePassword.onCreated(function() {
    Session.set('gamePasswordErrors', {});
});

Template.gamePassword.helpers({
    errorMessage: function(field) {
        return Session.get('gamePasswordErrors')[field];
    },
    errorClass: function(field) {
        return !!Session.get('gamePasswordErrors')[field] ? 'has-error' : '';
    },
    showPasswordField: function() {
        return this.passwordProtected;
    }
});

Template.gamePassword.events({
    'submit form': function(e, tmpl) {
        e.preventDefault();

        var roomId = this._id;
        var password = this.passwordProtected ? e.target.password.value : '';

        Meteor.call(
            'joinGameRoom', roomId, password,
            function(err, result) {
                if (err) return Errors.throw(err.reason);

                if (result.notLoggedOn) {
                    Errors.throw('You\'re not logged on.');
                } else if (result.alreadyInRoom) {
                    Errors.throw('You\'re already in a room.');
                } else if (result.alreadyStarted) {
                    Errors.throw('This game has already started.');
                } else if (result.isAtCapacity) {
                    Errors.throw('Sorry, the room you\'re trying to join is full.');
                } else if (result.wrongPassword) {
                    Session.set('gamePasswordErrors', {password: 'Incorrect password.'});
                } else if (result.success) {
                    //ga
                    ga('send', 'event', 'game', 'join');

                    Router.go('gameRoomPage', {
                        _id: roomId
                    });
                } else {
                    Errors.throw('An unknown error prevented you from joining this room.');
                }
            }
        );
    }
});