var socket = io();

socket.on('connect first', function () {
    socket.emit('save user', getCookie('hashed_id'));
});
