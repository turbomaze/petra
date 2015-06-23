Template.gameForm.onCreated(function() {
    Session.set('gameErrors', {});
});

Template.gameForm.helpers({
    errorMessage: function(field) {
        return Session.get('gameErrors')[field];
    },
    errorClass: function(field) {
        return !!Session.get('gameErrors')[field] ? 'has-error' : '';
    }
});

Template.gameForm.events({
    'submit form': function(e, tmpl) {
        e.preventDefault();


    }
});