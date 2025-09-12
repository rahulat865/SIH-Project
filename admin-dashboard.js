// admin-dashboard.js - Admin dashboard functionality
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { getFirestore, doc, getDoc, deleteDoc, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';

// Firebase config (same as events.js)
const firebaseConfig = {
  apiKey: "AIzaSyBzImCF5LEAi0sxftKN13CMyDvSFLlf8eI",
  authDomain: "prototype-8e533.firebaseapp.com",
  projectId: "prototype-8e533",
  storageBucket: "prototype-8e533.appspot.com",
  messagingSenderId: "111824910708",
  appId: "1:111824910708:web:1b48db17ed82130ef99421"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in and is admin
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const role = await getUserRole(user.uid);
      if (role === 'admin') {
        currentUser = user;
        document.getElementById('adminEmail').textContent = user.email;
        setupAdminDashboard();
      } else {
        alert('Access denied. Admin privileges required.');
        window.location.href = 'login.html';
      }
    } else {
      window.location.href = 'login.html';
    }
  });
});

async function getUserRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data().role || 'user') : 'user';
}

function setupAdminDashboard() {
  // Setup event form
  setupEventForm();
  
  // Load all content
  loadAllContent();
}

// Event Form Setup
function setupEventForm() {
  const form = document.getElementById('eventForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value.trim();
    const monastery = document.getElementById('eventMonastery').value;
    const contact = document.getElementById('eventContact').value.trim();
    
    if (!title || !description || !date || !time || !location) {
      alert('Please fill in all required fields.');
      return;
    }
    
    try {
      const eventData = {
        title,
        description,
        date,
        time,
        location,
        monastery: monastery || null,
        contact: contact || null,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      };
      
      await addDoc(collection(db, 'events'), eventData);
      
      // Clear form
      form.reset();
      
      alert('Event added successfully!');
      
      // Switch to experiences tab to see the new event
      showTab('experiences');
      
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
    }
  });
}

// Tab switching
function showTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  
  // Add active class to the correct button
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    if (btn.onclick && btn.onclick.toString().includes(`'${tabName}'`)) {
      btn.classList.add('active');
    }
  });
}

// Load all content
function loadAllContent() {
  loadAllExperiences();
  loadAllPhotos();
  loadAllVideos();
  loadAllFeedback();
}

// Load all experiences
function loadAllExperiences() {
  const q = query(collection(db, 'userExperiences'), orderBy('createdAt', 'desc'));
  
  onSnapshot(q, (snapshot) => {
    const container = document.getElementById('allExperiencesList');
    container.innerHTML = '';
    
    document.getElementById('totalExperiences').textContent = snapshot.size;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = createAdminExperienceCard(doc.id, data);
      container.appendChild(card);
    });
  });
}

// Load all photos
function loadAllPhotos() {
  const q = query(collection(db, 'userPhotos'), orderBy('createdAt', 'desc'));
  
  onSnapshot(q, (snapshot) => {
    const container = document.getElementById('allPhotosList');
    container.innerHTML = '';
    
    document.getElementById('totalPhotos').textContent = snapshot.size;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = createAdminPhotoCard(doc.id, data);
      container.appendChild(card);
    });
  });
}

// Load all videos
function loadAllVideos() {
  const q = query(collection(db, 'userVideos'), orderBy('createdAt', 'desc'));
  
  onSnapshot(q, (snapshot) => {
    const container = document.getElementById('allVideosList');
    container.innerHTML = '';
    
    document.getElementById('totalVideos').textContent = snapshot.size;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = createAdminVideoCard(doc.id, data);
      container.appendChild(card);
    });
  });
}

// Load all feedback
function loadAllFeedback() {
  const q = query(collection(db, 'userFeedback'), orderBy('createdAt', 'desc'));
  
  onSnapshot(q, (snapshot) => {
    const container = document.getElementById('allFeedbackList');
    container.innerHTML = '';
    
    document.getElementById('totalFeedback').textContent = snapshot.size;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = createAdminFeedbackCard(doc.id, data);
      container.appendChild(card);
    });
  });
}

// Create admin experience card
function createAdminExperienceCard(id, data) {
  const card = document.createElement('div');
  card.className = 'content-card';
  
  const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
  const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date';
  
  card.innerHTML = `
    <div class="card-content">
      <div class="user-info">
        <strong>User:</strong> ${data.userEmail}<br>
        <strong>Date:</strong> ${date}
      </div>
      <h4>${data.title}</h4>
      <div class="meta">${data.monastery} • ${stars}</div>
      <p>${data.description}</p>
      <div class="actions">
        <button class="btn-delete" onclick="deleteExperience('${id}')">Delete</button>
      </div>
    </div>
  `;
  
  return card;
}

// Create admin photo card
function createAdminPhotoCard(id, data) {
  const card = document.createElement('div');
  card.className = 'content-card';
  
  const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date';
  
  card.innerHTML = `
    <img src="${data.imageData}" alt="${data.title}">
    <div class="card-content">
      <div class="user-info">
        <strong>User:</strong> ${data.userEmail}<br>
        <strong>Date:</strong> ${date}
      </div>
      <h4>${data.title}</h4>
      <div class="meta">${data.monastery}</div>
      <p>${data.description}</p>
      <div class="actions">
        <button class="btn-delete" onclick="deletePhoto('${id}')">Delete</button>
      </div>
    </div>
  `;
  
  return card;
}

// Create admin video card
function createAdminVideoCard(id, data) {
  const card = document.createElement('div');
  card.className = 'content-card';
  
  const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date';
  
  card.innerHTML = `
    <video controls>
      <source src="${data.videoData}" type="${data.fileType}">
    </video>
    <div class="card-content">
      <div class="user-info">
        <strong>User:</strong> ${data.userEmail}<br>
        <strong>Date:</strong> ${date}
      </div>
      <h4>${data.title}</h4>
      <div class="meta">${data.monastery}</div>
      <p>${data.description}</p>
      <div class="actions">
        <button class="btn-delete" onclick="deleteVideo('${id}')">Delete</button>
      </div>
    </div>
  `;
  
  return card;
}

// Create admin feedback card
function createAdminFeedbackCard(id, data) {
  const card = document.createElement('div');
  card.className = 'content-card';
  
  const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
  const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date';
  
  card.innerHTML = `
    <div class="card-content">
      <div class="user-info">
        <strong>User:</strong> ${data.userEmail}<br>
        <strong>Date:</strong> ${date}
      </div>
      <h4>${data.subject}</h4>
      <div class="meta">${data.type} • ${stars}</div>
      <p>${data.message}</p>
      <div class="actions">
        <button class="btn-delete" onclick="deleteFeedback('${id}')">Delete</button>
      </div>
    </div>
  `;
  
  return card;
}

// Delete functions
async function deleteExperience(id) {
  if (confirm('Are you sure you want to delete this experience?')) {
    try {
      await deleteDoc(doc(db, 'userExperiences', id));
      alert('Experience deleted successfully!');
    } catch (error) {
      console.error('Error deleting experience:', error);
      alert('Failed to delete experience.');
    }
  }
}

async function deletePhoto(id) {
  if (confirm('Are you sure you want to delete this photo?')) {
    try {
      await deleteDoc(doc(db, 'userPhotos', id));
      alert('Photo deleted successfully!');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo.');
    }
  }
}

async function deleteVideo(id) {
  if (confirm('Are you sure you want to delete this video?')) {
    try {
      await deleteDoc(doc(db, 'userVideos', id));
      alert('Video deleted successfully!');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video.');
    }
  }
}

async function deleteFeedback(id) {
  if (confirm('Are you sure you want to delete this feedback?')) {
    try {
      await deleteDoc(doc(db, 'userFeedback', id));
      alert('Feedback deleted successfully!');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Failed to delete feedback.');
    }
  }
}

// Logout function
async function logout() {
  try {
    await signOut(auth);
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error signing out:', error);
    alert('Failed to logout. Please try again.');
  }
}

// Make functions globally available
window.showTab = showTab;
window.deleteExperience = deleteExperience;
window.deletePhoto = deletePhoto;
window.deleteVideo = deleteVideo;
window.deleteFeedback = deleteFeedback;
window.logout = logout;
