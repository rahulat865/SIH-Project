// events.js - Client-only backend using Firebase Auth + Firestore
// Fill in your Firebase web config below.

// IMPORTANT: Replace with your Firebase project's config values
const firebaseConfig = {
  apiKey: "AIzaSyBzImCF5LEAi0sxftKN13CMyDvSFLlf8eI",
  authDomain: "prototype-8e533.firebaseapp.com",
  projectId: "prototype-8e533",
  storageBucket: "prototype-8e533.appspot.com",
  messagingSenderId: "111824910708",
  appId: "1:111824910708:web:1b48db17ed82130ef99421",
  measurementId: "G-YLXTWE24KH"
};

// Dynamic imports for Firebase v10 modular SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helpers
function $(id) { return document.getElementById(id); }

async function ensureUserDoc(uid, role) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { role, createdAt: serverTimestamp() });
  } else if (role && snap.data()?.role !== role) {
    // Do not downgrade/upgrade silently; keep existing role
  }
}

async function getUserRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data().role || 'user') : 'user';
}

// ===== Login Page Logic =====
function setupLoginPage() {
  const adminForm = $('admin-login-title') ? $('admin-login-title').closest('div').querySelector('form') : null;
  const userForm = $('user-login-title') ? $('user-login-title').closest('div').querySelector('form') : null;
  const adminPanel = $('admin-panel');
  const logoutBtn = $('logout-btn');

  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('admin-email').value.trim();
      const password = $('admin-password').value;
      try {
        let cred;
        try {
          cred = await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
          if (String(err.code).includes('user-not-found')) {
            cred = await createUserWithEmailAndPassword(auth, email, password);
            await ensureUserDoc(cred.user.uid, 'admin');
          } else {
            throw err;
          }
        }
        await ensureUserDoc(cred.user.uid, 'admin');
        alert('Admin logged in successfully! Redirecting to admin dashboard...');
        window.location.href = 'admin-dashboard.html';
      } catch (err) {
        alert('Login failed: ' + (err.message || err));
      }
    });
  }

  if (userForm) {
    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('user-email').value.trim();
      const password = $('user-password').value;
      try {
        let cred;
        try {
          cred = await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
          if (String(err.code).includes('user-not-found')) {
            cred = await createUserWithEmailAndPassword(auth, email, password);
            await ensureUserDoc(cred.user.uid, 'user');
          } else {
            throw err;
          }
        }
        await ensureUserDoc(cred.user.uid, 'user');
        alert('User logged in successfully! Redirecting to dashboard...');
        window.location.href = 'user-dashboard.html';
      } catch (err) {
        alert('Login failed: ' + (err.message || err));
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (!adminPanel) return;
    if (user) {
      const role = await getUserRole(user.uid);
      if (role === 'admin') {
        adminPanel.style.display = 'block';
        setupAdminEventForm(user);
      } else {
        adminPanel.style.display = 'none';
      }
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
      adminPanel.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  });
}

function setupAdminEventForm(user) {
  const form = $('event-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('event-title').value.trim();
    const date = $('event-date').value; // ISO string from input[type=date]
    const description = $('event-description').value.trim();
    const imageUrl = $('event-image').value.trim();
    if (!title || !date) { alert('Title and date are required'); return; }
    try {
      await addDoc(collection(db, 'events'), {
        title,
        date,
        description,
        imageUrl,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      form.reset();
      alert('Event added');
    } catch (err) {
      alert('Failed to add event: ' + (err.message || err));
    }
  });
}

// ===== Public Events Rendering (any page) =====
function setupEventsList() {
  const list = $('events-list');
  if (!list) return;
  const q = query(collection(db, 'events'), orderBy('date', 'asc'));
  onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(docSnap => {
      const ev = docSnap.data();
      const card = document.createElement('div');
      card.className = 'event-card';
      card.innerHTML = `
        ${ev.imageUrl ? `<img src="${ev.imageUrl}" alt="${ev.title}">` : ''}
        <div class="content">
          <h4>${ev.title || ''}</h4>
          <div class="meta">${ev.date || ''}</div>
          <p>${ev.description || ''}</p>
        </div>
      `;
      items.push(card);
    });
    list.innerHTML = '';
    items.forEach(el => list.appendChild(el));
  });
}

// ===== User Content Display (Homepage) =====
function setupUserContent() {
  // Load user experiences
  loadPublicExperiences();
  loadPublicPhotos();
  loadPublicVideos();
}

function loadPublicExperiences() {
  const container = document.getElementById('userExperiences');
  if (!container) return;
  
  const q = query(collection(db, 'userExperiences'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'user-content-card';
      card.innerHTML = `
        <div class="content-header">
          <h4>${data.title}</h4>
          <span class="rating">${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)}</span>
        </div>
        <div class="content-meta">${data.monastery} • ${data.userEmail}</div>
        <p>${data.description}</p>
      `;
      items.push(card);
    });
    container.innerHTML = '';
    items.slice(0, 6).forEach(el => container.appendChild(el)); // Show only latest 6
  });
}

function loadPublicPhotos() {
  const container = document.getElementById('userPhotos');
  if (!container) return;
  
  const q = query(collection(db, 'userPhotos'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'user-content-card';
      card.innerHTML = `
        <img src="${data.imageData}" alt="${data.title}">
        <div class="content-info">
          <h4>${data.title}</h4>
          <div class="content-meta">${data.monastery} • ${data.userEmail}</div>
          <p>${data.description}</p>
        </div>
      `;
      items.push(card);
    });
    container.innerHTML = '';
    items.slice(0, 6).forEach(el => container.appendChild(el)); // Show only latest 6
  });
}

function loadPublicVideos() {
  const container = document.getElementById('userVideos');
  if (!container) return;
  
  const q = query(collection(db, 'userVideos'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'user-content-card';
      card.innerHTML = `
        <video controls>
          <source src="${data.videoData}" type="${data.fileType}">
        </video>
        <div class="content-info">
          <h4>${data.title}</h4>
          <div class="content-meta">${data.monastery} • ${data.userEmail}</div>
          <p>${data.description}</p>
        </div>
      `;
      items.push(card);
    });
    container.innerHTML = '';
    items.slice(0, 4).forEach(el => container.appendChild(el)); // Show only latest 4
  });
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  setupLoginPage();
  setupEventsList();
  setupUserContent();
});


