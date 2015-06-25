Template.gameRoom.helpers({
    currentNumPlayers: function() {
        return this.players.length;
    }
});

Template.gameRoom.events({
    'click .join': function(e, tmpl) {
        e.preventDefault();

        var roomId = this._id;
        var password = '';
        if (this.passwordProtected) {
            password = prompt('Enter the room\'s password:');
            if (password === null && typeof password === 'object') {
                return; //they canceled
            }
        }

        Meteor.call(
            'joinGameRoom', roomId, password,
            function(err, result) {
                if (err) return console.log(err.reason);

                console.log(result);
                if (result.success) {
                    Router.go('gameRoomPage', {
                        _id: roomId
                    });
                }
            }
        );
    }
});