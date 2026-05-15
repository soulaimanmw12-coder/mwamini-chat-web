// MWAMINI CHAT WEB Config
const SUPABASE_URL = "https://lffrzrwdevjwfasnhgf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZnJ6cndlZXZqd2pmYXNuaGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzY2NTksImV4cCI6MjA5NDQ1MjY1OX0.Vx6tb6gwt-O7oumGUXeGSYmw1wfoduoFSGwv-xkBvcY";
const CLOUD_NAME = "dwem3zv3t";
const UPLOAD_PRESET = "Mwaminichatweb";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;
let activeChatId = null;

document.getElementById('btn-register').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message); else alert("Check your email!");
});

document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload();
});

supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');
        loadUsers();
    }
});

async function loadUsers() {
    const list = document.getElementById('user-list');
    list.innerHTML = "";
    const { data: users } = await supabase.from('profiles').select('*');
    if (!users) {
        list.innerHTML = "<p style='padding:15px; font-size:12px; color:gray;'>No other users found yet.</p>";
        return;
    }
    users.forEach(u => {
        if(u.id === currentUser.id) return;
        const div = document.createElement('div');
        div.className = "user-item";
        div.innerHTML = `<span>${u.email}</span>`;
        div.onclick = () => startChat(u.id, u.email);
        list.appendChild(div);
    });
}

function startChat(id, email) {
    activeChatId = currentUser.id < id ? `${currentUser.id}_${id}` : `${id}_${currentUser.id}`;
    document.getElementById('chat-header').innerText = email;
    document.getElementById('chat-input-area').classList.remove('hidden');
}

document.getElementById('btn-send').addEventListener('click', async () => {
    const textIn = document.getElementById('text-input');
    const fileIn = document.getElementById('media-input');
    const status = document.getElementById('upload-status');
    const file = fileIn.files[0];

    if(!textIn.value && !file) return;
    
    let msgData = { sender_id: currentUser.id, chat_id: activeChatId };

    if(file) {
        status.classList.remove('hidden');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        msgData.media_url = data.secure_url;
        msgData.media_type = file.type;
        status.classList.add('hidden');
    } else {
        msgData.text = textIn.value;
    }

    renderMessage(msgData);
    textIn.value = "";
    fileIn.value = "";
});

function renderMessage(m) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = "message sent";
    if (m.media_url) {
        div.innerHTML = m.media_type.includes('image') ? `<img src="${m.media_url}" style="max-width:100%;">` : `<video src="${m.media_url}" controls style="max-width:100%;"></video>`;
    } else { div.innerText = m.text; }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
