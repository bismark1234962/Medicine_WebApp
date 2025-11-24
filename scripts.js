const shareButton = document.querySelector(".share-btn");
const fabButton = document.querySelector(".fab");
const profileButtons = document.querySelectorAll(".profile-btn");
const authTabs = document.querySelectorAll(".auth-tab");
const authForms = document.querySelectorAll(".auth-form");
const apptTabs = document.querySelectorAll(".appt-tab");
const apptStates = document.querySelectorAll(".empty-state");
const backButton = document.querySelector('[data-nav="back"]');
const bookButtons = document.querySelectorAll(".book-btn");
const useLocationButtons = document.querySelectorAll(".use-location");

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

const AUTH_KEY = "medicineBarberAuth";
let isAuthenticated = localStorage.getItem(AUTH_KEY) === "true";

const shareData = {
  title: "Medicine Barber",
  text: "Book your next cut with Medicine Barber.",
  url: window.location.href,
};

const navigateToLogin = () => {
  window.location.href = "login.html";
};

const handleProfileClick = () => {
  if (!isAuthenticated) {
    navigateToLogin();
  } else {
    window.location.href = "appointments.html";
  }
};

profileButtons.forEach((btn) => {
  btn.addEventListener("click", handleProfileClick);
});

bookButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!isAuthenticated) {
      navigateToLogin();
    } else {
      window.location.href = "appointments.html";
    }
  });
});

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    authTabs.forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    authForms.forEach((form) => {
      form.classList.toggle("hidden", form.dataset.form !== target);
    });
  });
});

authForms.forEach((form) => {
  form.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const type = form.dataset.form;
    localStorage.setItem(AUTH_KEY, "true");
    isAuthenticated = true;
    alert(
      type === "login"
        ? "Logged in! Redirecting to appointments..."
        : "Account created! Redirecting to appointments..."
    );
    window.location.href = "appointments.html";
  });
});

apptTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const view = tab.dataset.view;
    apptTabs.forEach((t) => t.classList.toggle("active", t === tab));
    apptStates.forEach((state) => {
      state.classList.toggle("hidden", state.dataset.view !== view);
    });
  });
});

if (backButton) {
  backButton.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "index.html";
    }
  });
}

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

if (fabButton) {
  fabButton.addEventListener("click", () => {
    if (!isAuthenticated) {
      navigateToLogin();
    } else {
      window.location.href = "appointments.html";
    }
  });
}

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

const getDirectionsBtn = document.querySelector('.primary-btn[href*="maps.app.goo.gl"]');
if (getDirectionsBtn) {
  getDirectionsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openDirectionsWithLocation();
  });
}

const mapOverlay = document.querySelector(".map-click-overlay");
if (mapOverlay) {
  mapOverlay.addEventListener("click", () => {
    openDirectionsWithLocation();
  });
}

