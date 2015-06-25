Template.gamePassword.helpers({
    errorClass: function(field) {
        return false;
    },
    errorMessage: function(field) {
        return false;
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