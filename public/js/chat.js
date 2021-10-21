var socket = io();
var chatContainer = document.querySelector('.chat-container .chat');
var messagesContainer = chatContainer.querySelector('.messages');
var messagesLoader = messagesContainer.querySelector('.loading');
var messageReplyElem = document.querySelector('.form-container .message-reply');
var messageForm = document.querySelector('.form-container form.message-form');
var messageInput = messageForm.querySelector('textarea');
var usersTypingElem = document.querySelector('.form-container .users-typing');
var usersContainer = chatContainer.querySelector('.users');
var onlineUsersList = usersContainer.querySelector('.online');
var offlineUsersList = usersContainer.querySelector('.offline');
window.loadedMessages = [];
window.loadingMessages = [false, false];
window.lastMessage = null;
window.messageReplyID = null;

function countTextareaLines(textarea) {
    var _buffer;

    if (_buffer == null) {
        _buffer = document.createElement('textarea');
        _buffer.style.border = 'none';
        _buffer.style.height = '0';
        _buffer.style.overflow = 'hidden';
        _buffer.style.padding = '0';
        _buffer.style.position = 'absolute';
        _buffer.style.left = '0';
        _buffer.style.top = '0';
        _buffer.style.zIndex = '-1';
        document.body.appendChild(_buffer);
    }

    var cs = getComputedStyle(textarea);
    var pl = parseInt(cs.paddingLeft);
    var pr = parseInt(cs.paddingRight);
    var lh = parseInt(cs.lineHeight);

    if (isNaN(lh)) lh = parseInt(cs.fontSize);

    _buffer.style.width = (textarea.clientWidth - pl - pr) + 'px';
    _buffer.style.font = cs.font;
    _buffer.style.letterSpacing = cs.letterSpacing;
    _buffer.style.whiteSpace = cs.whiteSpace;
    _buffer.style.wordBreak = cs.wordBreak;
    _buffer.style.wordSpacing = cs.wordSpacing;
    _buffer.style.wordWrap = cs.wordWrap;
    _buffer.value = textarea.value;
    var result = Math.floor(_buffer.scrollHeight / lh);

    if (result === 0) {
        result = 1;
    }

    return result;
}

function messagesScrolledTop() {
    return messagesContainer.scrollTop < messagesLoader.getBoundingClientRect().height / 2 + 10;
}

function messagesScrolledBottom() {
    return messagesContainer.scrollHeight - messagesContainer.scrollTop === messagesContainer.clientHeight;
}

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

    return text;
}

function scrollMessagesToBottom() {
    messagesContainer.scrollTo(0, messagesContainer.scrollHeight);
}

function cropText(text, maxLength) {
    var newText = text.substr(0, maxLength);

    if (newText.length !== text.length) {
        newText = newText.trim() + '...';
    }

    return newText;
}

function removeNewLines(text) {
    return text.replace(/\n/gim, ' ');
}

function textareaStyle() {
    var scrollBottom = false;
    var lineHeight = parseInt(getComputedStyle(messageInput).lineHeight.match(/\d+/));
    var paddingTop = parseInt(getComputedStyle(messageInput).paddingTop.match(/\d/));
    var lines = Math.min(countTextareaLines(messageInput), 10);

    messageInput.scrollHeight = (lines * lineHeight) + (paddingTop * 2);
    messageInput.rows = lines;
    messageInput.scrollTop = messageInput.scrollHeight;

    if (messagesScrolledBottom()) {
        scrollBottom = true;
    }

    messagesContainer.style.paddingBottom = 100 + ((lines - 1) * 20) + 'px';

    if (scrollBottom) {
        scrollMessagesToBottom();
    }
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

async function addMessage(message, first, forceScrollBottom) {
    var noAuthor, own = false;
    var scrollBottom = messagesScrolledBottom() || forceScrollBottom;
    var elem = document.createElement('div');

    await Promise.all([
        new Promise(function (resolve, reject) {
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

            var content = escapeHTMLTags(message.content.trim());
            content = content.replace(
                /http(s)?:\/\/((www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gmi,
                '<a href="http$1://$2" target="_blank" class="link-primary-hover">http$1://$2</a>'
            );
            content = parseMarkdown(content);
            content = content.replace(/\s/gm, '&nbsp;');

            elem.classList.add('message');
            elem.classList.add('message-' + message._id);
            elem.dataset.id = message._id;
            elem.id = 'message-' + message._id;
            elem.innerHTML = '<div class="author"><a href="#">' + escapeHTMLTags(message.user.username) +
                '</a></div><div class="content">' + content + '</div>';

            if (message.reply) {
                elem.innerHTML = '<div class="reply reply-' + message.reply._id + '"><a href="#message-' + message.reply._id +
                    '"><div class="author">' + escapeHTMLTags(message.reply.user.username) + '</div><div class="content">' +
                    removeNewLines(escapeHTMLTags(cropText(message.reply.content, 50))) + '</div></a></div>' + elem.innerHTML;
                elem.classList.add('with-reply')
            }

            elem.innerHTML = elem.innerHTML + addMessageOperations(message._id);

            if (own) {
                elem.classList.add('own');
            }

            if (noAuthor) {
                elem.classList.add('no-author');
            }

            if (message.reply && message.reply.user._id === getCookie('hashed_id')) {
                elem.classList.add('mention');
            }
        }),
        new Promise(function (resolve, reject) {
            if (first) {
                window.loadedMessages.unshift(message);

                if (window.loadedMessages[1].user._id === message.user._id) {
                    var firstMessage = document.querySelector('.message.message-' + window.loadedMessages[1]._id);

                    if (firstMessage) {
                        firstMessage.classList.add('no-author');
                        elem.classList.remove('no-author');
                    }
                }

                messagesContainer.insertBefore(elem, messagesContainer.childNodes[1]);
            } else {
                window.loadedMessages.push(message);
                messagesContainer.appendChild(elem);
            }

            messagesContainer.scrollTo(0, messagesContainer.scrollHeight - messagesContainer.clientHeight - window.lastScrollPosition);

            if (scrollBottom) {
                scrollMessagesToBottom();
            }
        })
    ]);
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
    socket.emit('user stopped typing', getCookie('hashed_id'));
}

function replyMessage(target) {
    window.messageReplyID = target.dataset.id;
    var message = document.querySelector('.message-' + window.messageReplyID);
    messageReplyElem.classList.remove('none');
    messageReplyElem.querySelector('.author').innerText = message.querySelector('.author a').innerText;
    messageReplyElem.querySelector('.content').innerText = cropText(message.querySelector('.content').innerText, 65);
    messageReplyElem.querySelector('.close').dataset.id = window.messageReplyID;
    messageReplyElem.querySelector('.close').addEventListener('click', function () {
        replyMessageCancel();
    });
    messageInput.focus();
}

function replyMessageCancel() {
    window.messageReplyID = null;
    messageReplyElem.classList.add('none');
    messageReplyElem.querySelector('.author').innerText = '';
    messageReplyElem.querySelector('.content').innerText = '';
}

function hideMessagesLoader(none) {
    messagesLoader.style.opacity = '0';
    setTimeout(function () {
        if (none) {
            messagesLoader.style.opacity = '1';
            messagesLoader.classList.add('none');
        }

        messagesLoader.querySelector('.icon').classList.remove('animate');
    }, 250);
}

function showMessagesLoader() {
    messagesLoader.classList.remove('none');
    messagesLoader.style.opacity = '1';

    setTimeout(function () {
        messagesLoader.querySelector('.icon').classList.add('animate');
    });
}

function loadMessages(messages, offset) {
    if (!messages.length) {
        hideMessagesLoader(true);
        return;
    }

    messages = messages.reverse();
    var oldMessages = false;

    if (!offset) {
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
    }

    for (var i = 0; i < messages.length; i++) {
        if (!offset) {
            var findMessage = window.loadedMessages.find(function (m) {
                return m._id === messages[i]._id
            });

            if (findMessage) {
                return;
            }
        }

        addMessage(messages[i], !!offset);
    }

    hideMessagesLoader();
}

function loadMessagesOffset() {
    if (!window.loadingMessages[0]) {
        window.loadingMessages[0] = true;
        return;
    }

    if (messagesScrolledTop() && !window.loadingMessages[1]) {
        window.loadingMessages[1] = true;
        socket.emit('get messages offset', window.loadedMessages.length);
    }
}

addEventListener('load', function () {
    if (typeof Promise === 'undefined' || Promise.toString().indexOf('[native code]') === -1){
        return location.href = '/browser-not-support';
    }

    // loadMessagesOffset();
});

addEventListener('keydown', function (e) {
    if (document.activeElement !== messageInput && e.ctrlKey && e.keyCode === 222) {
        messageInput.focus();
    }
});

messagesContainer.addEventListener('scroll', function () {
    if (messagesContainer.scrollTop - messagesLoader.getBoundingClientRect().height - 10 < 1) {
        showMessagesLoader();
    } else {
        hideMessagesLoader();
    }

    window.lastScrollPosition = Math.abs((messagesContainer.scrollHeight - messagesContainer.scrollTop) -
        (messagesContainer.scrollHeight - (messagesContainer.scrollHeight - messagesContainer.clientHeight)));

    loadMessagesOffset();
});

messageInput.addEventListener('keypress', function (e) {
    if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    } else if (e.keyCode === 13 && e.shiftKey) {
        e.preventDefault();

        var start = messageInput.value.substr(0, messageInput.selectionStart);
        var end = messageInput.value.substr(messageInput.selectionStart);
        var newLine = '\n';

        messageInput.value = start + newLine + end;
        messageInput.selectionStart = start.length + newLine.length;
        messageInput.selectionEnd = messageInput.selectionStart;
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

socket.on('connect first', function () {
    socket.emit('save user', getCookie('hashed_id'));
});

socket.on('load users', function (users) {
    var onlineTitle = onlineUsersList.querySelector('span.title');
    var offlineTitle = offlineUsersList.querySelector('span.title');
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

    onlineTitle.innerText = 'Online Users - ' + onlineUl.childNodes.length;
    offlineTitle.innerText = 'Offline Users - ' + offlineUl.childNodes.length;
});

socket.on('load messages', function (messages) {
    loadMessages(messages);
});

socket.on('load messages offset', function (messages) {
    messages = messages.reverse();
    window.loadingMessages[1] = false;
    loadMessages(messages, true);
});

socket.on('add message', function (message) {
    var scrollBottom = false;

    if (message.user._id === getCookie('hashed_id')) {
        scrollBottom = true;
    }

    addMessage(message, false, scrollBottom);
});

socket.on('user online', function (user) {
    var title = onlineUsersList.querySelector('span.title');
    var offlineTitle = offlineUsersList.querySelector('span.title');
    var ul = onlineUsersList.querySelector('ul');
    var offlineUl = offlineUsersList.querySelector('ul');
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

    title.innerText = 'Online Users - ' + ul.childNodes.length;
    offlineTitle.innerText = 'Offline Users - ' + offlineUl.childNodes.length;
});

socket.on('user offline', function (user) {
    var title = offlineUsersList.querySelector('span.title');
    var onlineTitle = onlineUsersList.querySelector('span.title');
    var ul = offlineUsersList.querySelector('ul');
    var onlineUl = onlineUsersList.querySelector('ul');
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

    title.innerText = 'Offline Users - ' + ul.childNodes.length;
    onlineTitle.innerText = 'Online Users - ' + onlineUl.childNodes.length;
});

socket.on('load users typing', function (users) {
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

socket.on('user banned', function () {
    return location.href = '/';
});
