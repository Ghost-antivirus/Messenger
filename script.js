document.addEventListener('DOMContentLoaded', () => {
    let username = localStorage.getItem('username');
    let chatList = JSON.parse(localStorage.getItem('chats')) || {};
    let selectedChat = null;
    let usersOnline = JSON.parse(localStorage.getItem('usersOnline')) || [];
    const socket = new WebSocket('ws://10.13.214.60:8080/chat');

    // Функция для отображения чатов
    function renderChatList() {
        const chatListElement = document.getElementById('chat-list');
        chatListElement.innerHTML = '';
        for (let chatName in chatList) {
            const li = document.createElement('li');
            li.textContent = chatName;
            li.className = 'chat-item';

            if (chatList[chatName].some(msg => !msg.read && msg.sender !== username)) {
                li.classList.add('new-message');
            }

            li.addEventListener('click', () => selectChat(chatName));
            chatListElement.appendChild(li);
        }
    }

    // Функция для отображения сообщений
    function renderMessages() {
        const messagesElement = document.getElementById('messages');
        messagesElement.innerHTML = ''; // Очистка перед перерисовкой
        if (selectedChat && chatList[selectedChat]) {
            chatList[selectedChat].forEach(message => {
                const div = document.createElement('div');
                div.classList.add('message', message.sender === username ? 'sent' : 'received');
                div.textContent = message.text;

                if (message.sender !== username) {
                    message.read = true; // Сообщение помечается как прочитанное
                }

                // Добавляем контекстное меню для удаления и редактирования сообщения
                div.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showContextMenu(e, div, message);
                });

                messagesElement.appendChild(div);
            });
            messagesElement.scrollTop = messagesElement.scrollHeight;
        }
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
            const message = { sender: username, text: messageText, read: false };
            chatList[selectedChat].push(message);
            localStorage.setItem('chats', JSON.stringify(chatList));
            socket.send(`${username}: ${messageText}`); // Отправка сообщения на сервер
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

        const editButton = document.createElement('button');
        editButton.textContent = 'Редактировать';
        editButton.addEventListener('click', () => {
            const newText = prompt('Измените сообщение:', message.text);
            if (newText) {
                const index = chatList[selectedChat].indexOf(message);
                if (index > -1) {
                    chatList[selectedChat][index].text = newText;
                    localStorage.setItem('chats', JSON.stringify(chatList));
                    renderMessages();
                }
            }
            document.body.removeChild(contextMenu);
        });

        contextMenu.appendChild(editButton);
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
            updateUsersOnline(); // Обновляем список пользователей онлайн
        }
    }

    // Функция для создания приватного чата
    function createPrivateChat(user) {
        const chatName = `Чат с ${user}`;
        if (!chatList[chatName]) {
            chatList[chatName] = [];
            localStorage.setItem('chats', JSON.stringify(chatList));
            renderChatList();
        }
        selectChat(chatName);
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
            div.className = 'user-online';
            div.addEventListener('click', () => createPrivateChat(user)); // Создание приватного чата
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
        const [sender, text] = messageData.split(': ');
        if (selectedChat) {
            chatList[selectedChat].push({ sender, text, read: false });
            localStorage.setItem('chats', JSON.stringify(chatList));
            renderMessages();
        } else {
            alert(`Новое сообщение от ${sender}: ${text}`);
        }
    };

    socket.onclose = () => {
        console.log('Соединение закрыто.');
    };

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
    document.getElementById('send-message').addEventListener('click', sendMessage);
    document.getElementById('message-text').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
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
