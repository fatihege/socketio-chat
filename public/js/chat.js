var socket = io();
var chatContainer = document.querySelector('.chat-container .chat');
var messagesContainer = chatContainer.querySelector('.messages');
var messageReplyElem = document.querySelector('.form-container .message-reply');
var messageForm = document.querySelector('.form-container form.message-form');
var messageInput = messageForm.querySelector('textarea');
var usersTypingElem = document.querySelector('.form-container .users-typing');
var usersContainer = chatContainer.querySelector('.users');
var onlineUsersList = usersContainer.querySelector('.online');
var offlineUsersList = usersContainer.querySelector('.offline');
window.loadedMessages = [];
window.lastMessage = null;
window.messageReplyID = null;

function getCookie(cname) {
    var name = cname + '=';
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');

    for (var i = 0; i <ca.length; i++) {
        var c = ca[i];

        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }

        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }

    return '';
}

function escapeHTMLTags(text) {
    if (!text) {
        return text;
    }

    text = text.replace(/</gmi, '&lt;');
    text = text.replace(/>/gmi, '&gt;');
    text = text.replace(/\//gmi, '&#47;');

    return text;
}

function scrollMessagesToBottom() {
    messagesContainer.scrollTo(0, messagesContainer.scrollHeight);
}

function textareaStyle() {
    var rowCount = Math.min(messageInput.value.split(/\n/gm).length, 6);
    messageInput.rows = rowCount;
    messageInput.scrollTop = messageInput.scrollHeight;
    messagesContainer.style.paddingBottom = 100 + ((rowCount - 1) * 20) + 'px';
}

function typingTimeoutFunc() {
    userTypingEvent(messageInput.value.trim());
}

function userTypingEvent(oldValue) {
    if (!messageInput.value.trim().length) {
        socket.emit('user stopped typing', getCookie('hashed_id'));
        return;
    }

    if (oldValue) {
        if (oldValue === messageInput.value.trim()) {
            socket.emit('user stopped typing', getCookie('hashed_id'));
        } else {
            clearTimeout(window.typingTimeout);
            window.typingTimeout = setTimeout(typingTimeoutFunc, 3000);
        }
    } else {
        if (messageInput.value.trim().length) {
            socket.emit('user started typing', getCookie('hashed_id'));

            clearTimeout(window.typingTimeout);
            window.typingTimeout = setTimeout(typingTimeoutFunc, 3000);
        }
    }
}

function addMessageOperations(id) {
    return '<div class="operations"><div class="op op-reply" data-id="' + id + '" onclick="replyMessage(this)"><img src="/img/reply.svg" alt="Reply" title="Reply"></div></div>';
}

function addMessage(message, first) {
    var noAuthor, own = false;

    if (window.lastMessage && window.lastMessage._id === message._id) {
        return;
    }

    if (window.lastMessage && window.lastMessage.user._id === message.user._id) {
        noAuthor = true;
    }

    if (message.user._id === getCookie('hashed_id')) {
        own = true;
    }

    window.lastMessage = message;

    var elem = document.createElement('div');
    elem.classList.add('message');
    elem.classList.add('message-' + message._id);
    elem.dataset.id = message._id;
    elem.id = 'message-' + message._id;
    elem.innerHTML = '<div class="author"><a href="#">' + escapeHTMLTags(message.user.username) +
        '</a></div><div class="content">' + escapeHTMLTags(message.content) + '</div>';

    if (message.reply) {
        elem.innerHTML = '<div class="reply reply-' + message.reply._id + '"><a href="#message-' + message.reply._id +
            '"><div class="author">' + escapeHTMLTags(message.reply.user.username) + '</div><div class="content">' +
            escapeHTMLTags(message.reply.content) + '</div></a></div>' + elem.innerHTML;
    }

    elem.innerHTML = elem.innerHTML + addMessageOperations(message._id);

    if (own) {
        elem.classList.add('own');
    }

    if (noAuthor) {
        elem.classList.add('no-author');
    }

    setTimeout(function () {
        if (first) {
            messagesContainer.insertBefore(elem, messagesContainer.firstChild);
        } else {
            messagesContainer.appendChild(elem);
        }

        scrollMessagesToBottom();
    }, 5);
}

function sendMessage() {
    var message = messageInput.value.trim();
    var replyID = window.messageReplyID || null;

    if (!message.length) {
        return;
    }

    socket.emit('send message', getCookie('hashed_id'), message, replyID);
    messageInput.value = '';
    replyMessageCancel();
}

function replyMessage(target) {
    window.messageReplyID = target.dataset.id;
    var message = document.querySelector('.message-' + window.messageReplyID);
    messageReplyElem.style.display = 'block';
    messageReplyElem.querySelector('.author').innerText = message.querySelector('.author a').innerText;
    messageReplyElem.querySelector('.content').innerText = message.querySelector('.content').innerText;
    messageReplyElem.querySelector('.close').dataset.id = window.messageReplyID;
    messageReplyElem.querySelector('.close').addEventListener('click', function () {
        replyMessageCancel();
    });
    messageInput.focus();
}

function replyMessageCancel() {
    window.messageReplyID = null;
    messageReplyElem.style.display = 'none';
    messageReplyElem.querySelector('.author').innerText = '';
    messageReplyElem.querySelector('.content').innerText = '';
}

messageInput.addEventListener('keypress', function (e) {
    if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    } else if (e.keyCode === 13 && e.shiftKey) {
        e.preventDefault();
        messageInput.value += '\n';
    }

    textareaStyle();
});

messageInput.addEventListener('input', function () {
    textareaStyle();
    userTypingEvent();
});

messageForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage();
});

socket.on('connect first', () => {
    socket.emit('save user', getCookie('hashed_id'));
});

socket.on('load users', (users) => {
    var onlineUl = onlineUsersList.querySelector('ul');
    var offlineUl = offlineUsersList.querySelector('ul');
    onlineUl.innerHTML = '';
    offlineUl.innerHTML = '';

    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        var li = document.createElement('li');
        li.dataset.id = user._id;
        li.innerHTML = '<a href="#"' + ((user._id === getCookie('hashed_id')) ? ' class="active"' : '') + '>' +
            escapeHTMLTags(user.username) +'</a>';
        if (user.status === 'online') {
            onlineUsersList.classList.remove('none');
            onlineUl.appendChild(li);
        } else if (user.status === 'offline') {
            offlineUsersList.classList.remove('none');
            offlineUl.appendChild(li);
        }
    }
});

socket.on('load messages', (messages) => {
    if (!messages.length) {
        return;
    }

    messages = messages.reverse();
    var oldMessages = false;

    if (window.loadedMessages.length) {
        if (window.loadedMessages.length > messages.length) {
            for (var i = 0; i < window.loadedMessages.length; i++) {
                if (window.loadedMessages[i]._id !== messages[i]._id) {
                    oldMessages = false;
                    break;
                } else {
                    oldMessages = true;
                }
            }
        } else {
            for (var i = 0; i < messages.length; i++) {
                if (messages[i]._id !== window.loadedMessages[i]._id) {
                    oldMessages = false;
                    break;
                } else {
                    oldMessages = true;
                }
            }
        }
    }

    if (oldMessages) {
        return;
    }

    for (var i = 0; i < messages.length; i++) {
        var findMessage = window.loadedMessages.find(function (m) {
            return m._id === messages[i]._id
        });
        if (findMessage) {
            return;
        }
        window.loadedMessages.push(messages[i]);
        addMessage(messages[i]);
    }
});

socket.on('add message', (message) => {
    addMessage(message);
});

socket.on('user online', (user) => {
    var ul = onlineUsersList.querySelector('ul');
    var inTheOfflineList = offlineUsersList.querySelector('ul li[data-id="' + user._id + '"]');

    onlineUsersList.classList.remove('none');

    if (inTheOfflineList) {
        inTheOfflineList.remove();
    }

    if (
        !offlineUsersList.querySelectorAll('ul li[data-id]') ||
        !offlineUsersList.querySelectorAll('ul li[data-id]').length
    ) {
        offlineUsersList.querySelector('ul').innerHTML = '';
        offlineUsersList.classList.add('none');
    }

    if (!ul.querySelector('li[data-id="' + user._id + '"]')) {
        var li = document.createElement('li');
        li.dataset.id = user._id;
        li.innerHTML = '<a href="#"' + ((user._id === getCookie('hashed_id')) ?
            ' class="active"' : '') + '>' + escapeHTMLTags(user.username) + '</a>';

        ul.appendChild(li);
    }
});

socket.on('user offline', (user) => {
    var ul = offlineUsersList.querySelector('ul');
    var inTheOnlineList = onlineUsersList.querySelector('ul li[data-id="' + user._id + '"]');

    offlineUsersList.classList.remove('none');

    if (inTheOnlineList) {
        inTheOnlineList.remove();
    }

    if (
        !onlineUsersList.querySelectorAll('ul li[data-id]') ||
        !onlineUsersList.querySelectorAll('ul li[data-id]').length
    ) {
        onlineUsersList.querySelector('ul').innerHTML = '';
        onlineUsersList.classList.add('none');
    }

    if (!ul.querySelector('li[data-id="' + user._id + '"]')) {
        var li = document.createElement('li');
        li.dataset.id = user._id;
        li.innerHTML = '<a href="#"' + ((user._id === getCookie('hashed_id')) ?
            ' class="active"' : '') + '>' + escapeHTMLTags(user.username) + '</a>';

        ul.appendChild(li);
    }
});

socket.on('load users typing', (users) => {
    users = users.filter(function (u) {
        return u._id !== getCookie('hashed_id');
    });

    if (users.length) {
        var content = '';

        if (users.length > 5) {
            content = 'Several people are typing...';
        } else {
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                content += '<strong>' + escapeHTMLTags(user.username) + '</strong>';

                if (i < users.length - 1) {
                    content += ', ';
                }
            }
            
            content += ' typing...';
        }

        usersTypingElem.innerHTML = content;
        usersTypingElem.classList.remove('hidden');
    } else {
        usersTypingElem.innerHTML = '&nbsp;';
        usersTypingElem.classList.add('hidden');
    }
});
