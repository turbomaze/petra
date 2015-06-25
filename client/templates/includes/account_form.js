Template.accountForm.onCreated(function() {
    Session.set('accountErrors', {});
});

Template.accountForm.helpers({
    errorMessage: function(field) {
        return Session.get('accountErrors')[field];
    },
    errorClass: function(field) {
        return !!Session.get('accountErrors')[field] ? 'has-error' : '';
    }
});

Template.accountForm.events({
    'submit form': function(e, tmpl) {
        e.preventDefault();

        var username = e.target.username.value;
        var password = 'v'+e.target.password.value;

        if (!username) {
            return Session.set('accountErrors', {
                username: 'Usernames are required.'
            });
        }

        Accounts.createUser({
            username: username,
            password: password
        }, function(err1) {
            //'username already exists' error means
            //they might be trying to log in
            if (err1 && err1.error === 403) {
                Meteor.loginWithPassword(username, password,
                    function(err2) {
                        if (err2 && err2.error === 403) {
                            return Session.set(
                                'accountErrors', {
                                    username: 'Username is in use',
                                    password: '...or incorrect password.'
                                }
                            );
                        } else if (err2) {
                            throw new Meteor.Error(
                                'error', err2.reason
                            );
                        } else {
                            //successful login
                        }
                    }
                );
            } else if (err1 && err1.error === 400) {
                return Session.set('accountErrors', {
                    password: err1.message
                });
            } else if (err1) {
                return Session.set('accountErrors', {
                    username: err1.message
                });
            } else {
                //successful registration
            }
        });
    }
});