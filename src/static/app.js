document.addEventListener("DOMContentLoaded", () => {
  // Get all UI elements
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const closeLoginBtn = document.getElementById("close-login");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const teacherOnlySection = document.getElementById("teacher-only");
  const studentView = document.getElementById("student-view");
  const userInfo = document.getElementById("user-info");
  const usernameDisplay = document.getElementById("username-display");
  const loginLink = document.getElementById("login-link");

  // Session state
  let currentSession = {
    token: localStorage.getItem("session_token"),
    username: localStorage.getItem("username")
  };

  // Check if session is still valid on page load
  if (currentSession.token) {
    verifySession();
  }

  // Function to verify if current session is valid
  async function verifySession() {
    try {
      const response = await fetch("/verify-session", {
        method: "POST",
        body: new URLSearchParams({
          session_token: currentSession.token
        })
      });
      
      const result = await response.json();
      
      if (result.valid) {
        setTeacherMode(true, result.username);
      } else {
        // Session expired
        clearSession();
        setTeacherMode(false);
      }
    } catch (error) {
      console.error("Error verifying session:", error);
      clearSession();
      setTeacherMode(false);
    }
  }

  // Function to set UI to teacher or student mode
  function setTeacherMode(isTeacher, username = "") {
    if (isTeacher) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      teacherOnlySection.classList.remove("hidden");
      studentView.classList.add("hidden");
      userInfo.classList.remove("hidden");
      usernameDisplay.textContent = username;
      
      // Show delete buttons only for teachers
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.classList.remove("hidden");
      });
    } else {
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      teacherOnlySection.classList.add("hidden");
      studentView.classList.remove("hidden");
      userInfo.classList.add("hidden");
      
      // Hide delete buttons for students
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.classList.add("hidden");
      });
    }
  }

  // Function to clear session from storage
  function clearSession() {
    currentSession = { token: null, username: null };
    localStorage.removeItem("session_token");
    localStorage.removeItem("username");
  }

  // Login button handler
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    document.getElementById("login-username").focus();
  });

  // Close login modal
  closeLoginBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  // Close modal when clicking outside
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
      loginForm.reset();
      loginMessage.classList.add("hidden");
    }
  });

  // Login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        body: new URLSearchParams({
          username: username,
          password: password
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Store session
        currentSession.token = result.session_token;
        currentSession.username = result.username;
        localStorage.setItem("session_token", result.session_token);
        localStorage.setItem("username", result.username);

        // Update UI
        setTeacherMode(true, result.username);
        
        // Close modal
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginMessage.classList.add("hidden");

        // Show success message
        messageDiv.textContent = `Welcome, ${result.username}!`;
        messageDiv.className = "success message";
        messageDiv.classList.remove("hidden");
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);

        // Refresh activities to show delete buttons
        fetchActivities();
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error message";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Failed to login. Please try again.";
      loginMessage.className = "error message";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Logout button handler
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", {
        method: "POST",
        body: new URLSearchParams({
          session_token: currentSession.token
        })
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    clearSession();
    setTeacherMode(false);
    
    messageDiv.textContent = "Logged out successfully";
    messageDiv.className = "success message";
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 3000);

    // Refresh activities to hide delete buttons
    fetchActivities();
  });

  // Login link in student view
  loginLink.addEventListener("click", (e) => {
    e.preventDefault();
    loginBtn.click();
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn ${!currentSession.token ? 'hidden' : ''}" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!currentSession.token) {
      messageDiv.textContent = "You must be logged in as a teacher to unregister students";
      messageDiv.className = "error message";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&session_token=${encodeURIComponent(currentSession.token)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success message";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error message";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error message";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!currentSession.token) {
      messageDiv.textContent = "You must be logged in as a teacher to register students";
      messageDiv.className = "error message";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&session_token=${encodeURIComponent(currentSession.token)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success message";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error message";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error message";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
