var container = document.querySelector('.container');
var curtain = document.querySelector('.curtain');
window.openedModal = null;

function createModal(title, message, button, form, modalValues) {
    if (window.openedModal) {
        return closeModal();
    }

    curtain.style.display = 'block';

    var modal = document.createElement('div');
    modal.classList.add('modal');
    modal.classList.add('hidden');

    var modalTitle = document.createElement('div');
    modalTitle.classList.add('title');
    modalTitle.innerText = title;
    modal.appendChild(modalTitle);

    var modalContent = document.createElement('div');
    modalContent.classList.add('content');
    modalContent.innerText = message;
    modal.appendChild(modalContent);

    var modalButtons = document.createElement('div');
    modalButtons.classList.add('buttons');
    modal.appendChild(modalButtons);

    var modalButtonForm = document.createElement('form');
    modalButtonForm.action = form.action;
    modalButtonForm.method = form.method;

    var modalFormCsrfInput = document.createElement('input');
    modalFormCsrfInput.type = 'hidden';
    modalFormCsrfInput.name = '_csrf';
    modalFormCsrfInput.value = form.csrf.value;
    modalButtonForm.appendChild(modalFormCsrfInput);

    if (modalValues && Object.keys(modalValues).length) {
        for (var [k, v] of Object.entries(modalValues)) {
            var modalFormInput = document.createElement('input');
            modalFormInput.type = 'hidden';
            modalFormInput.name = k;
            modalFormInput.value = v;
            modalButtonForm.appendChild(modalFormInput);
        }
    }

    var modalButton = document.createElement('button');
    modalButton.type = 'submit';
    modalButton.classList.add('btn');
    modalButton.classList.add('btn-' + button.type);
    modalButton.innerText = button.text;
    modalButtonForm.appendChild(modalButton);

    var closeModalButton = document.createElement('button');
    closeModalButton.classList.add('close-btn');
    closeModalButton.classList.add('btn');
    closeModalButton.classList.add('btn-white-reversed');
    closeModalButton.innerText = 'Close';
    modalButtons.appendChild(modalButtonForm);
    modalButtons.appendChild(closeModalButton);
    container.appendChild(modal);

    setTimeout(function () {
        modal.classList.remove('hidden');
    });

    window.openedModal = modal;

    closeModalButton.addEventListener('click', function () {
        closeModal();
    });

    modalButtonForm.addEventListener('submit', function () {
        closeModal();
    });
}

function closeModal() {
    if (!window.openedModal) {
        return;
    }

    window.openedModal.classList.add('hidden');

    setTimeout(function () {
        curtain.style.display = 'none';
        window.openedModal.remove();
        window.openedModal = null;
    }, 300);
}

addEventListener('keydown', function (e) {
    var isEscape;

    if (e.key) {
        isEscape = e.key.toLowerCase() === 'escape' || e.key.toLowerCase() === 'esc';
    } else {
        isEscape = e.keyCode === 27;
    }

    if (isEscape) {
        closeModal();
    }
});

curtain.addEventListener('click', function () {
    closeModal();
});

var modals = {
    logout: [
        'Are you sure?',
        'Are you sure you want to exit the application?',
        { text: 'Yes', type: 'danger' },
        { method: 'POST', action: '/logout',
            csrf: document.querySelector('.chat-container .chat .users .logout input[name="_csrf"]') || '' }
    ],
    'delete-role': [
        'Are you sure?',
        'Are you sure you want to delete this role?',
        { text: 'Yes', type: 'danger' },
        { method: 'POST', action: '/admin/roles/delete',
            csrf: document.querySelector('.roles-container .role .actions form input[name="_csrf"]') || '' }
    ],
    'ban-user': [
        'Are you sure?',
        'Are you sure you want to ban this user?',
        { text: 'Yes', type: 'danger' },
        { method: 'POST', action: '/admin/users/ban',
            csrf: document.querySelector('.users-container .user .actions form input[name="_csrf"]') || '' }
    ],
    'unban-user': [
        'Are you sure?',
        'Are you sure you want to unban this user?',
        { text: 'Yes', type: 'primary' },
        { method: 'POST', action: '/admin/users/unban',
            csrf: document.querySelector('.users-container .user .actions form input[name="_csrf"]') || '' }
    ],
    'activate-user': [
        'Are you sure?',
        'Are you sure you want to activate this user?',
        { text: 'Yes', type: 'primary' },
        { method: 'POST', action: '/admin/users/activate',
            csrf: document.querySelector('.users-container .user .actions form input[name="_csrf"]') || '' }
    ],
    'deactivate-user': [
        'Are you sure?',
        'Are you sure you want to deactivate this user?',
        { text: 'Yes', type: 'danger' },
        { method: 'POST', action: '/admin/users/deactivate',
            csrf: document.querySelector('.users-container .user .actions form input[name="_csrf"]') || '' }
    ],
    'delete-user': [
        'Are you sure?',
        'Are you sure you want to delete this user?',
        { text: 'Yes', type: 'danger' },
        { method: 'POST', action: '/admin/users/delete',
            csrf: document.querySelector('.users-container .user .actions form input[name="_csrf"]') || '' }
    ],
};
var modalButtons = document.querySelectorAll('[data-modal]');

if (modalButtons && modalButtons.length) {
    for (var i = 0; i < modalButtons.length; i++) {
        modalButtons[i].addEventListener('click', function (e) {
            e.preventDefault();

            if (!this) {
                return;
            }

            createModal(...modals[this.dataset.modal], JSON.parse(this.dataset.modalValues || '{}'))
        });
    }
}
