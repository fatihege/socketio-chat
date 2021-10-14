var container = document.querySelector('.container');
var curtain = document.querySelector('.curtain');
window.openedModal = null;

function createModal(title, message, button, form) {
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
    modalFormCsrfInput.value = form.csrf;
    modalButtonForm.appendChild(modalFormCsrfInput);

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

    console.log(window.openedModal)

    window.openedModal.classList.add('hidden');

    setTimeout(function () {
        curtain.style.display = 'none';
        window.openedModal.remove();
        window.openedModal = null;
    }, 300);
}

curtain.addEventListener('click', function () {
    closeModal();
});

var modals = {
    logout: [
        'Are you sure?',
        'Are you sure you want to exit the application?',
        { text: 'Yes', type: 'danger' },
        { method: 'POST', action: '/logout',
            csrf: document.querySelector('.chat-container .chat .users .logout input[type="hidden"]').value }
    ]
};
var modalButtons = document.querySelectorAll('[data-modal]');

if (modalButtons && modalButtons) {
    for (var i = 0; i < modalButtons.length; i++) {
        var btn = modalButtons[i];

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            createModal(...modals[btn.dataset.modal])
        });
    }
}
