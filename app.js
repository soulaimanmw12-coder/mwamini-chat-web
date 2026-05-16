// MWAMINI CHAT WEB - Secure Connection Version
const SUPABASE_URL = "https://lffrzrwdevjwfasnhgf.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZnJ6cndlZXZqd2pmYXNuaGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzY2NTksImV4cCI6MjA5NDQ1MjY1OX0.Vx6tb6gwt-O7oumGUXeGSYmw1wfoduoFSGwv-xkBvcY";
const CLOUD_NAME = "dwem3zv3t";
const UPLOAD_PRESET = "Mwaminichatweb";

// Initialize Supabase with extra safety
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let activeChatId = null;

// --- 1. AUTHENTICATION ---
document.getElementById('btn-register').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert("Registration Error: " + error.message); 
    else alert("Success! Check your email to verify.");
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

// --- 2. USER LIST (The "Fetch" part) ---
async function loadUsers() {
    try {
        const { data: users, error } = await supabase.from('profiles').select('*');
        
        if (error) {
            console.error("Supabase Fetch Error:", error);
            // If RLS is blocking you, this will show the specific reason
            alert("Database Error: " + error.message); 
            return;
        }

        const list = document.getElementById('user-list');
        list.innerHTML = "";
        
        if (users && users.length > 0) {
            users.forEach(u => {
                if(u.id === currentUser.id) return;
                const div = document.createElement('div');
                div.className = "user-item";
                div.innerHTML = `<span>${u.email}</span>`;
                div.onclick = () => startChat(u.id, u.email);
                list.appendChild(div);
            });
        } else {
            list.innerHTML = "<p style='padding:15px; color:gray;'>No other users found.</p>";
        }
    } catch (err) {
        console.error("Connection Error:", err);
        alert("Connection failed. Check your internet or Supabase status.");
    }
}

function startChat(id, email) {
    activeChatId = currentUser.id < id ? `${currentUser.id}_${id}` : `${id}_${currentUser.id}`;
    document.getElementById('chat-header').innerText = `Chat with: ${email}`;
    document.getElementById('chat-input-area').classList.remove('hidden');
    loadMessages();
}

// --- 3. MESSAGING & MEDIA ---
async function loadMessages() {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', activeChatId)
        .order('created_at', { ascending: true });
    
    if (error) console.error("Error loading messages:", error);

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
        if (m.media_type && m.media_type.includes('image')) {
            div.innerHTML = `<img src="${m.media_url}" style="max-width:100%; border-radius:8px;">`;
        } else {
            div.innerHTML = `<video src="${m.media_url}" controls style="max-width:100%; border-radius:8px;"></video>`;
        }
    } else {
        div.innerText = m.text;
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

document.getElementById('btn-send').addEventListener('click', async () => {
    const textIn = document.getElementById('text-input');
    const fileIn = document.getElementById('media-input');
    const status = document.getElementById('upload-status');
    const file = fileIn.files[0];

    let msgData = { 
        sender_id: currentUser.id, 
        chat_id: activeChatId 
    };

    if(file) {
        status.style.display = "block";
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { 
                method: 'POST', 
                body: formData 
            });
            const cData = await res.json();
            msgData.media_url = cData.secure_url;
            msgData.media_type = file.type;
        } catch (err) {
            alert("Cloudinary Upload Failed!");
        }
        status.style.display = "none";
    } else {
        if(!textIn.value.trim()) return;
        msgData.text = textIn.value;
    }

    const { error } = await supabase.from('messages').insert([msgData]);
    if (error) alert("Send Error: " + error.message);

    textIn.value = ""; 
    fileIn.value = "";
    loadMessages();
});
