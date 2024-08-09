document.addEventListener('DOMContentLoaded', () => {
    let username = localStorage.getItem('username');
    let chatList = JSON.parse(localStorage.getItem('chats')) || {};
    let selectedChat = null;
    let usersOnline = JSON.parse(localStorage.getItem('usersOnline')) || [];
    const socket = new WebSocket('ws://localhost:8080');

    // Функция для отображения чатов
    function renderChatList() {
        const chatListElement = document.getElementById('chat-list');
        chatListElement.innerHTML = '';
        for (let chatName in chatList) {
            const li = document.createElement('li');
            li.textContent = chatName;
            li.addEventListener('click', () => selectChat(chatName));
            chatListElement.appendChild(li);
        }
    }

    // Функция для отображения сообщений
    function renderMessages(message) {
        const messagesElement = document.getElementById('messages');
        const div = document.createElement('div');
        div.classList.add('message', message.sender === username ? 'sent' : 'received');
        div.textContent = message.text;
        messagesElement.appendChild(div);
        messagesElement.scrollTop = messagesElement.scrollHeight;
    }

    // Функция для выбора чата
    function selectChat(chatName) {
        selectedChat = chatName;
        document.getElementById('chat-header').textContent = chatName;
        renderMessages();
    }

    // Функция отправки сообщения
    function sendMessage() {
        const messageText = document.getElementById('message-text').value.trim();
        if (messageText && selectedChat) {
            const message = { sender: username, text: messageText };
            chatList[selectedChat].push(message);
            localStorage.setItem('chats', JSON.stringify(chatList));
            document.getElementById('message-text').value = '';
            renderMessages();
        }
    }

    // Функция для отображения контекстного меню
    function showContextMenu(e, messageElement, message) {
        const contextMenu = document.createElement('div');
        contextMenu.classList.add('context-menu');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Удалить';
        deleteButton.addEventListener('click', () => {
            const index = chatList[selectedChat].indexOf(message);
            if (index > -1) {
                chatList[selectedChat].splice(index, 1);
                localStorage.setItem('chats', JSON.stringify(chatList));
                renderMessages();
            }
            document.body.removeChild(contextMenu);
        });

        contextMenu.appendChild(deleteButton);
        document.body.appendChild(contextMenu);

        // Позиционирование контекстного меню
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;

        // Закрытие контекстного меню при клике вне его
        document.addEventListener('click', function onClickOutside() {
            if (contextMenu) {
                document.body.removeChild(contextMenu);
            }
            document.removeEventListener('click', onClickOutside);
        }, { once: true });
    }

    // Смена имени пользователя
    function changeUsername() {
        const newUsername = prompt('Введите новое имя пользователя:', username);
        if (newUsername) {
            username = newUsername;
            localStorage.setItem('username', username);
        }
    }

    // Поиск чатов
    function searchChats() {
        const searchText = document.getElementById('chat-search').value.toLowerCase();
        const chatListElement = document.getElementById('chat-list');
        chatListElement.innerHTML = '';
        for (let chatName in chatList) {
            if (chatName.toLowerCase().includes(searchText)) {
                const li = document.createElement('li');
                li.textContent = chatName;
                li.addEventListener('click', () => selectChat(chatName));
                chatListElement.appendChild(li);
            }
        }
    }

    // Функция для отображения пользователей онлайн
    function renderUsersOnline() {
        const usersOnlineElement = document.getElementById('users-online');
        usersOnlineElement.innerHTML = '';
        usersOnline.forEach(user => {
            const div = document.createElement('div');
            div.textContent = user;
            usersOnlineElement.appendChild(div);
        });
    }

    // Обновление списка пользователей онлайн
    function updateUsersOnline() {
        if (!usersOnline.includes(username)) {
            usersOnline.push(username);
        }
        localStorage.setItem('usersOnline', JSON.stringify(usersOnline));
        renderUsersOnline();
    }

    // Удаление пользователя из списка онлайн при закрытии страницы
    window.addEventListener('beforeunload', () => {
        usersOnline = usersOnline.filter(user => user !== username);
        localStorage.setItem('usersOnline', JSON.stringify(usersOnline));
    });

    // Инициализация пользователя
    if (!username) {
        username = prompt('Введите ваше имя пользователя:');
        localStorage.setItem('username', username);
    }

    socket.onopen = () => {
        console.log('Соединение установлено.');
        socket.send(`${username} присоединился к чату.`);
    };

    socket.onmessage = (event) => {
        const messageData = event.data;
        renderMessages({ text: messageData, sender: "other" });
    };

    socket.onclose = () => {
        console.log('Соединение закрыто.');
    };
    updateUsersOnline();

    // Создание стартовых данных, если они отсутствуют
    if (Object.keys(chatList).length === 0) {
        chatList = {
            'Общий чат': [],
            'Рабочий чат': [],
            'Друзья': []
        };
        localStorage.setItem('chats', JSON.stringify(chatList));
    }

    // Привязка событий
    // Привязка событий
    document.getElementById('send-message').addEventListener('click', () => {
        const messageText = document.getElementById('message-text').value.trim();
        if (messageText) {
            const message = `${username}: ${messageText}`;
            socket.send(message);
            renderMessages({ text: messageText, sender: username });
            document.getElementById('message-text').value = '';
        }
    });
    document.getElementById('message-text').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const messageText = document.getElementById('message-text').value.trim();
            if (messageText) {
                const message = `${username}: ${messageText}`;
                socket.send(message);
                renderMessages({ text: messageText, sender: username });
                document.getElementById('message-text').value = '';
            }
        }
    });
    document.getElementById('menu-icon').addEventListener('click', () => {
        const settingsMenu = document.getElementById('settings-menu');
        settingsMenu.classList.toggle('hidden');
        settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
    });
    document.getElementById('change-username').addEventListener('click', changeUsername);
    document.getElementById('chat-search').addEventListener('input', searchChats);

    // Рендер начального состояния
    renderChatList();
    renderUsersOnline();
});
