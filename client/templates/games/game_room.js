Template.gameRoom.helpers({
    currentNumPlayers: function() {
        return this.players.length;
    }
});

Template.gameRoom.events({
    'click .join': function(e, tmpl) {
        e.preventDefault();

        var roomId = this._id;

        if (isInGameRoom(roomId)) {
            Router.go('gameRoomPage', {
                _id: roomId
            });
        } else {
            var password = '';
            if (this.passwordProtected) {
                password = prompt('Enter the room\'s password:');
                if (password === null && typeof password === 'object') {
                    return; //they canceled
                }
            }

            Meteor.call(
                'joinGameRoom', roomId, password,
                function (err, result) {
                    if (err) return Errors.throw(err.reason);

                    if (result.alreadyInRoom) {
                        Errors.throw('You\'re already in a room.');
                    } else if (result.alreadyStarted) {
                        Errors.throw('This game has already started.');
                    } else if (result.isAtCapacity) {
                        Errors.throw('Sorry, the room you\'re trying to join is full.');
                    } else if (result.wrongPassword) {
                        Errors.throw('Incorrect password.');
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
    }
});