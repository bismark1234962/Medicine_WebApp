// Initialize DOM elements - defer to ensure DOM is ready
let shareButton, fabButton, profileButtons, authTabs, authForms, apptTabs, apptStates, backButton, bookButtons, useLocationButtons;

const initializeDOMElements = () => {
  shareButton = document.querySelector(".share-btn");
  fabButton = document.querySelector(".fab");
  profileButtons = document.querySelectorAll(".profile-btn");
  authTabs = document.querySelectorAll(".auth-tab");
  authForms = document.querySelectorAll(".auth-form");
  apptTabs = document.querySelectorAll(".appt-tab");
  apptStates = document.querySelectorAll(".empty-state");
  backButton = document.querySelector('[data-nav="back"]');
  bookButtons = document.querySelectorAll(".book-btn");
  useLocationButtons = document.querySelectorAll(".use-location");
};

const DESTINATION_SHARE_LINK = "https://maps.app.goo.gl/6RznSKnKNvZ1vnRi7";
const DESTINATION_COORDS = {
  lat: 5.6073,
  lng: -0.2848,
};

const openDirectionsWithLocation = () => {
  if (!navigator.geolocation) {
    window.open(DESTINATION_SHARE_LINK, "_blank");
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${DESTINATION_COORDS.lat},${DESTINATION_COORDS.lng}&travelmode=driving`,
        "_blank"
      );
    },
    () => {
      window.open(DESTINATION_SHARE_LINK, "_blank");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
};

// Authentication state - will be updated by Firebase Auth
let isAuthenticated = false;

// Update auth state when Firebase is ready
const updateAuthState = () => {
  if (window.authModule) {
    isAuthenticated = window.authModule.isAuthenticated();
  }
};

// Listen for auth state changes
if (typeof window !== 'undefined') {
  const checkAuthModule = setInterval(() => {
    if (window.authModule) {
      clearInterval(checkAuthModule);
      window.authModule.onAuthStateChanged((user) => {
        isAuthenticated = user !== null;
      });
      updateAuthState();
    }
  }, 100);
}

const shareData = {
  title: "Medicine Barber",
  text: "Book your next cut with Medicine Barber.",
  url: window.location.href,
};

const navigateToLogin = () => {
  window.location.href = "login.html";
};

const handleProfileClick = () => {
  if (window.authModule) {
    const user = window.authModule.getCurrentUser();
    if (!user) {
      navigateToLogin();
    } else {
      window.location.href = "appointments.html";
    }
  } else if (window.firebaseAuth) {
    window.firebaseAuth.onAuthStateChanged((user) => {
      if (!user) {
        navigateToLogin();
      } else {
        window.location.href = "appointments.html";
      }
    });
  } else {
    navigateToLogin();
  }
};

// Booking Modal Functions
const openBookingModal = () => {
  const modal = document.getElementById('bookingModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // Set minimum date to today
    const dateInput = document.getElementById('dateInput');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }
};

apptTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const view = tab.dataset.view;
    apptTabs.forEach((t) => t.classList.toggle("active", t === tab));
    
    // Toggle empty states
    apptStates.forEach((state) => {
      state.classList.toggle("hidden", state.dataset.view !== view);
    });
    
    // Toggle appointment lists
    const upcomingList = document.getElementById('upcomingAppointments');
    const pastList = document.getElementById('pastAppointments');
    
    if (upcomingList && pastList) {
      if (view === 'upcoming') {
        upcomingList.classList.remove('hidden');
        pastList.classList.add('hidden');
      } else {
        upcomingList.classList.add('hidden');
        pastList.classList.remove('hidden');
      }
    }
  });
});

// Load and display appointments
const loadAppointments = async () => {
  // Check if we're on the appointments page
  if (!document.querySelector('.appointments-content')) {
    return;
  }

  // Wait for auth module to be ready
  const waitForAuth = setInterval(() => {
    if (window.authModule && window.appointmentsDb) {
      clearInterval(waitForAuth);
      
      const user = window.authModule.getCurrentUser();
      if (!user) {
        // User not logged in, redirect to login
        window.location.href = "login.html";
        return;
      }

      // Load appointments
      loadUpcomingAppointments();
      loadPastAppointments();

      // Subscribe to real-time updates
      window.appointmentsDb.subscribeToAppointments(null, (result) => {
        if (result.success) {
          const now = new Date();
          const upcoming = result.appointments.filter(apt => {
            // Handle Firestore Timestamp
            let appointmentDate;
            if (apt.date && apt.date.toDate) {
              appointmentDate = apt.date.toDate();
            } else if (apt.date) {
              appointmentDate = new Date(apt.date);
            } else {
              return false;
            }
            
            // Combine date and time
            const [hours, minutes] = apt.time ? apt.time.split(':') : [0, 0];
            appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            return appointmentDate >= now && apt.status !== 'cancelled';
          });
          
          const past = result.appointments.filter(apt => {
            // Handle Firestore Timestamp
            let appointmentDate;
            if (apt.date && apt.date.toDate) {
              appointmentDate = apt.date.toDate();
            } else if (apt.date) {
              appointmentDate = new Date(apt.date);
            } else {
              return false;
            }
            
            // Combine date and time
            const [hours, minutes] = apt.time ? apt.time.split(':') : [0, 0];
            appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            return appointmentDate < now || apt.status === 'completed' || apt.status === 'cancelled';
          });
          
          displayAppointments(upcoming, 'upcoming');
          displayAppointments(past, 'past');
        }
      });
    }
  }, 100);

  setTimeout(() => clearInterval(waitForAuth), 5000);
};

const loadUpcomingAppointments = async () => {
  if (!window.appointmentsDb) return;
  
  const result = await window.appointmentsDb.getUpcomingAppointments();
  if (result.success) {
    displayAppointments(result.appointments, 'upcoming');
  }
};

const loadPastAppointments = async () => {
  if (!window.appointmentsDb) return;
  
  const result = await window.appointmentsDb.getPastAppointments();
  if (result.success) {
    displayAppointments(result.appointments, 'past');
  }
};

const displayAppointments = (appointments, view) => {
  const container = document.getElementById(`${view}Appointments`);
  const emptyState = document.getElementById(`${view}Empty`);
  
  if (!container || !emptyState) return;

  // Clear container
  container.innerHTML = '';

  if (appointments.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  emptyState.classList.add('hidden');

  appointments.forEach(apt => {
    const appointmentCard = createAppointmentCard(apt);
    container.appendChild(appointmentCard);
  });
};

const createAppointmentCard = (appointment) => {
  const card = document.createElement('article');
  card.className = 'appointment-card';
  
  // Handle Firestore Timestamp
  let date;
  if (appointment.date && appointment.date.toDate) {
    date = appointment.date.toDate();
  } else if (appointment.date) {
    date = new Date(appointment.date);
  } else {
    date = new Date();
  }
  
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  const statusClass = appointment.status === 'cancelled' ? 'cancelled' : 
                     appointment.status === 'completed' ? 'completed' : 'confirmed';

  card.innerHTML = `
    <div class="appointment-header">
      <div>
        <h3>${appointment.service}</h3>
        <p class="appointment-date">${formattedDate} at ${appointment.time}</p>
      </div>
      <span class="appointment-status ${statusClass}">${appointment.status}</span>
    </div>
    <div class="appointment-details">
      <p><span class="material-symbol">person</span> ${appointment.barber}</p>
      ${appointment.notes ? `<p class="appointment-notes">${appointment.notes}</p>` : ''}
    </div>
    ${appointment.status === 'confirmed' ? `
      <button class="ghost-btn cancel-appointment" data-id="${appointment.id}">
        Cancel appointment
      </button>
    ` : ''}
  `;

  // Add cancel handler
  const cancelBtn = card.querySelector('.cancel-appointment');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to cancel this appointment?')) {
        const result = await window.appointmentsDb.cancelAppointment(appointment.id);
        if (result.success) {
          loadAppointments();
        } else {
          alert(`Error: ${result.error}`);
        }
      }
    });
  }

  return card;
};

// Initialize appointments when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAppointments);
} else {
  loadAppointments();
}

// Initialize all event listeners
const setupEventListeners = () => {
  initializeDOMElements();

  // Profile button - query directly
  const allProfileButtons = document.querySelectorAll(".profile-btn");
  if (allProfileButtons && allProfileButtons.length > 0) {
    allProfileButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleProfileClick();
      });
    });
  }

  // Book buttons
  if (bookButtons && bookButtons.length > 0) {
    bookButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.authModule) {
          const user = window.authModule.getCurrentUser();
          if (!user) {
            navigateToLogin();
          } else {
            // Open booking modal if we're on the appointments page
            const bookingModal = document.getElementById('bookingModal');
            if (bookingModal) {
              openBookingModal();
            } else {
              // Navigate to appointments page to open modal
              window.location.href = "appointments.html";
            }
          }
        } else if (window.firebaseAuth) {
          window.firebaseAuth.onAuthStateChanged((user) => {
            if (!user) {
              navigateToLogin();
            } else {
              // Open booking modal if we're on the appointments page
              const bookingModal = document.getElementById('bookingModal');
              if (bookingModal) {
                openBookingModal();
              } else {
                // Navigate to appointments page to open modal
                window.location.href = "appointments.html";
              }
            }
          });
        } else {
          navigateToLogin();
        }
      });
    });
  }

  // Back button
  if (backButton) {
    backButton.addEventListener("click", () => {
      window.history.back();
    });
  }

  // Share button
  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          console.warn("Share cancelled", err);
        }
      } else {
        navigator.clipboard.writeText(shareData.url);
        shareButton.textContent = "Copied!";
        setTimeout(
          () => (shareButton.innerHTML = '<span class="material-symbol">share</span>'),
          1500
        );
      }
    });
  }

  // FAB button
  if (fabButton) {
    fabButton.addEventListener("click", () => {
      if (!isAuthenticated) {
        navigateToLogin();
      } else {
        window.location.href = "appointments.html";
      }
    });
  }

  // Auth tabs - query directly to ensure we get them
  const allAuthTabs = document.querySelectorAll(".auth-tab");
  const allAuthForms = document.querySelectorAll(".auth-form");
  
  if (allAuthTabs && allAuthTabs.length > 0) {
    allAuthTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = tab.dataset.tab;
        
        // Update all tabs
        allAuthTabs.forEach((t) => {
          if (t === tab) {
            t.classList.add("active");
            t.setAttribute("aria-selected", "true");
          } else {
            t.classList.remove("active");
            t.setAttribute("aria-selected", "false");
          }
        });
        
        // Update all forms
        allAuthForms.forEach((form) => {
          if (form.dataset.form === target) {
            form.classList.remove("hidden");
          } else {
            form.classList.add("hidden");
          }
        });
      });
    });
  }

  // Auth forms
  if (authForms && authForms.length > 0) {
    authForms.forEach((form) => {
      form.addEventListener("submit", async (evt) => {
        evt.preventDefault();
        const type = form.dataset.form;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        // Disable button and show loading
        submitButton.disabled = true;
        submitButton.textContent = type === "login" ? "Logging in..." : "Creating account...";

        try {
          if (type === "login") {
            if (!window.authModule) {
              throw new Error('Auth module not initialized');
            }
            const email = form.querySelector('input[type="email"]').value;
            const password = form.querySelector('input[type="password"]').value;
            
            if (!email || !password) {
              throw new Error('Email and password are required');
            }
            
            const result = await window.authModule.signIn(email, password);
            
            if (result.success) {
              window.location.href = "appointments.html";
            } else {
              alert(`Login failed: ${result.error}`);
              submitButton.disabled = false;
              submitButton.textContent = originalText;
            }
          } else if (type === "signup") {
            if (!window.authModule) {
              throw new Error('Auth module not initialized');
            }
            const fullName = form.querySelector('input[type="text"]').value;
            const email = form.querySelector('input[type="email"]').value;
            const phoneNumber = form.querySelector('input[type="tel"]').value;
            const password = form.querySelector('input[type="password"]').value;
            
            if (!fullName || !email || !phoneNumber || !password) {
              throw new Error('All fields are required');
            }
            
            const result = await window.authModule.signUp(email, password, fullName, phoneNumber);
            
            if (result.success) {
              alert("Account created successfully! Redirecting...");
              window.location.href = "appointments.html";
            } else {
              alert(`Sign up failed: ${result.error}`);
              submitButton.disabled = false;
              submitButton.textContent = originalText;
            }
          }
        } catch (error) {
          console.error('Auth error:', error);
          alert(`Error: ${error.message}`);
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        }
      });
    });
  }

  // Appointment tabs
  if (apptTabs && apptTabs.length > 0) {
    apptTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const view = tab.dataset.view;
        apptTabs.forEach((t) => t.classList.toggle("active", t === tab));
        
        // Toggle empty states
        apptStates.forEach((state) => {
          state.classList.toggle("hidden", state.dataset.view !== view);
        });
        
        // Toggle appointment lists
        const upcomingList = document.getElementById('upcomingAppointments');
        const pastList = document.getElementById('pastAppointments');
        
        if (upcomingList && pastList) {
          if (view === 'upcoming') {
            upcomingList.classList.remove('hidden');
            pastList.classList.add('hidden');
          } else {
            upcomingList.classList.add('hidden');
            pastList.classList.remove('hidden');
          }
        }
      });
    });
  }

  // Use location buttons
  if (useLocationButtons && useLocationButtons.length > 0) {
    useLocationButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Locating...";
        openDirectionsWithLocation();
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = originalText;
        }, 1000);
      });
    });
  }

  // Get directions button
  const getDirectionsBtn = document.querySelector('.primary-btn[href*="maps.app.goo.gl"]');
  if (getDirectionsBtn) {
    getDirectionsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openDirectionsWithLocation();
    });
  }

  // Map overlay
  const mapOverlay = document.querySelector(".map-click-overlay");
  if (mapOverlay) {
    mapOverlay.addEventListener("click", () => {
      openDirectionsWithLocation();
    });
  }

  // Booking modal close
  const bookingModal = document.getElementById('bookingModal');
  if (bookingModal) {
    const closeBtn = bookingModal.querySelector('.close-modal');
    const overlay = bookingModal.querySelector('.modal-overlay');
    
    if (closeBtn) {
      closeBtn.addEventListener("click", closeBookingModal);
    }
    
    if (overlay) {
      overlay.addEventListener("click", closeBookingModal);
    }
  }

  // Booking form
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Booking...';

      try {
        const appointmentData = {
          service: document.getElementById('serviceSelect').value,
          barber: document.getElementById('barberSelect').value,
          date: new Date(document.getElementById('dateInput').value),
          time: document.getElementById('timeInput').value,
          notes: document.getElementById('notesInput').value,
          customerPhone: ''
        };

        if (!window.appointmentsDb) {
          throw new Error('Appointments database not initialized');
        }

        const result = await window.appointmentsDb.createAppointment(appointmentData);
        
        if (result.success) {
          alert('Appointment booked successfully!');
          bookingForm.reset();
          closeBookingModal();
          // Reload appointments
          loadAppointments();
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Booking error:', error);
        alert(`Error booking appointment: ${error.message}`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Forgot password button
  const forgotPasswordBtn = document.querySelector('.link-btn');
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async () => {
      const loginForm = document.querySelector('form[data-form="login"]');
      if (loginForm) {
        const email = loginForm.querySelector('input[type="email"]').value;
        if (!email) {
          alert('Please enter your email address first');
          return;
        }
        
        const result = await window.authModule.resetPassword(email);
        if (result.success) {
          alert('Password reset email sent! Check your inbox.');
        } else {
          alert(`Error: ${result.error}`);
        }
      }
    });
  }
};

// Run setup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupEventListeners, 100);
  });
} else {
  setTimeout(setupEventListeners, 100);
}

