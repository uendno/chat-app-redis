var socket = io();

// XSS options
var options = {
    whiteList: [],
    stripIgnoreTags: true,
    stripIgnoreTagBody: ['script']
};

// first disable the input box
$('#input-message').prop('disabled', true);

$('#btn-start').click(function (e) {
    e.preventDefault();
    find();
});

// User joined the room
socket.on('chat start', function (room) {
    $('#btn-start').text('DISCONNECT AND FIND');
    $('#input-message').prop('disabled', false);
    $('#input-message').focus();
    $('#messages').append($('<li class="text-center">').text("User joined."));
    scrollToBottom();
});

// User left the room
socket.on('chat end', function () {
    $('#btn-start').text('FIND');
    $('#input-message').prop('disabled', true);
    $('#messages').append($('<li class="text-center">').text("User left."));
    find();
    scrollToBottom();
});

// On receive chat message
socket.on('chat message', function (message) {
    console.log(message);
    $('#messages').append(mateMessage(message));
    scrollToBottom();
});

$('#input-form').submit(function (e) {
    e.preventDefault();
    var message = filterXSS($('#input-message').val(), options);
    socket.emit('chat message', message);
    $('#messages').append(myMessage(message));
    $('#input-message').val('');
    scrollToBottom();
    return false;
});

$('#send-button').click(function (e) {
    e.preventDefault();
    var message = filterXSS($('#input-message').val(), options);
    console.log(message);
    socket.emit('chat message', message);
    $('#messages').append(myMessage(message));
    $('#input-message').val('');
    scrollToBottom();
    return false;
});

var mateMessage = function (message) {
    return '<li class="text-left message">' + message + '</li>';
};

var myMessage = function (message) {
    return '<li class="text-right message">' + message + '</li>';
};

var find = function () {
    $('#input-message').prop('disabled', true);
    $('#messages').append($('<li class="text-center">').text("Searching..."));
    var myInfo = {
        gender: $('#my-gender').val(),
        age: $('#my-age').val(),
        preferredGender: $('#pref-gender').val(),
        preferredAge: $('#pref-age').val()
    };

    console.log(myInfo);

    socket.emit('match', myInfo);
};

var scrollToBottom = function () {
    $("#messages").animate({scrollTop: document.getElementById('messages').scrollHeight}, 50);
};