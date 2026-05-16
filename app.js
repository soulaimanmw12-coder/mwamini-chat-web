// --- CONFIGURATION ---
// I fixed the URL typo: 'lffrzrwdev' matches your Anon Key project reference
const SUPABASE_URL = "https://lffrzrwdevjwfasnhgf.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZnJ6cndlZXZqd2pmYXNuaGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzY2NTksImV4cCI6MjA5NDQ1MjY1OX0.Vx6tb6gwt-O7oumGUXeGSYmw1wfoduoFSGwv-xkBvcY";
const CLOUD_NAME = "dwem3zv3t";
const UPLOAD_PRESET = "Mwaminichatweb";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let activeChatId = null;

// --- 1. AUTHENTICATION ---
document.getElementById('btn-register').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert("Registration Error: " + error.message); 
    else alert("Success! Check your email to verify your account.");
});

document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login Error: " + error.message);
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

// --- 2. USER LIST ---
async function loadUsers() {
    // This fetches other users from the 'profiles' table you created in SQL
    const { data: users, error } = await supabase.from('profiles').select('*');
    const list = document.getElementById('user-list');
    
    if (error) {
        console.error("Fetch error:", error);
        return;
    }
    
    list.innerHTML = "";
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
    document.getElementById('chat-header').innerText = `Chatting with: ${email}`;
    document.getElementById('chat-input-area').classList.remove('hidden');
    loadMessages();
}

// --- 3. MESSAGING ---
async function loadMessages() {
    const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', activeChatId)
        .order('created_at', { ascending: true });

    const container = document.getElementById('chat-messages');
    container.innerHTML = "";
    if (data) data.forEach(renderMessage);
}

function renderMessage(m) {
    const container = document.getElementById('chat-messages');
    const side = m.sender_id === currentUser.id ? 'sent' : 'received';
    const div = document.createElement('div');
    div.className = `message ${side}`;
    
    if (m.media_url) {
        if (m.media_type.includes('image')) {
            div.innerHTML = `<img src="${m.media_url}" style="max-width:100%; border-radius:5px;">`;
        } else {
            div.innerHTML = `<video src="${m.media_url}" controls style="max-width:100%; border-radius:5px;"></video>`;
        }
    } else {
        div.innerText = m.text;
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// --- 4. SENDING ---
document.getElementById('btn-send').addEventListener('click', async () => {
    const textIn = document.getElementById('text-input');
    const fileIn = document.getElementById('media-input');
    const status = document.getElementById('upload-status');
    const file = fileIn.files[0];

    let msgData = { sender_id: currentUser.id, chat_id: activeChatId };

    if(file) {
        status.style.display = "block";
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        msgData.media_url = data.secure_url;
        msgData.media_type = file.type;
        status.style.display = "none";
    } else {
        if(!textIn.value) return;
        msgData.text = textIn.value;
    }

    await supabase.from('messages').insert([msgData]);
    textIn.value = "";
    fileIn.value = "";
    loadMessages();
});
