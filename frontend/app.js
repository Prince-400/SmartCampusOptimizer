
"use strict";
let editingRoomId = null;
let currentAppRole = null;
let currentUserId = null;
let editingBookingId = null;

const isManager = () =>
    ["owner", "admin"].includes(currentAppRole);

const isOwner = () => currentAppRole === "owner";

const supabaseClient = window.supabase.createClient(
    window.SUPABASE_CONFIG.URL,
    window.SUPABASE_CONFIG.PUBLISHABLE_KEY
);

document.addEventListener("DOMContentLoaded", () => {
    initializeNotifications();
    initializeLogin();
    initializeForgotPassword();
    initializeNavigation();
    initializeDashboard();
    initializeLogout();
    initializeBookingForm();
    initializeSmartAllocation();
    initializeRegistration();
    initializePasswordVisibility();
    
    checkExistingSession();
});

/* ------------------------------
   LOGIN
------------------------------ */


function initializeLogin() {
    const form = document.getElementById("loginForm");
    const passwordInput = document.getElementById("loginPassword");
    const togglePassword = document.getElementById("togglePassword");

    // Show / Hide Password
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                togglePassword.textContent = "🙈";
                togglePassword.setAttribute("aria-label", "Hide password");
            } else {
                passwordInput.type = "password";
                togglePassword.textContent = "👁";
                togglePassword.setAttribute("aria-label", "Show password");
            }
        });
    }

    // Login
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = passwordInput.value;
        const message = document.getElementById("loginMessage");

        message.textContent = "Signing in...";

        const { data, error } = await supabaseClient.auth
            .signInWithPassword({ email, password });

        if (error) {
            message.textContent = error.message;
            return;
        }

        currentAppRole = await verifyUserRole(data.user.id);

        if (!currentAppRole) {
            await supabaseClient.auth.signOut();
            message.textContent = "Access denied. Account unavailable.";
            return;
        }

        message.textContent = "";
        showDashboard(data.user);

        if (!verified) {
            await supabaseClient.auth.signOut();
            message.textContent =
                "Access denied. An administrator account is required.";
            return;
        }

    });
}


function initializeForgotPassword() {

    const loginForm = document.getElementById("loginForm");
    const forgotForm = document.getElementById("forgotPasswordForm");
    const recoveryForm = document.getElementById("recoveryPasswordForm");

    const forgotButton = document.getElementById("forgotPasswordButton");
    const backButton = document.getElementById("backToLoginButton");

    if (!loginForm || !forgotForm || !recoveryForm) return;

    // Show the forgot password form.
    forgotButton.addEventListener("click", () => {

        loginForm.hidden = true;
        forgotForm.hidden = false;
        recoveryForm.hidden = true;

        document.getElementById("resetEmail").value =
            document.getElementById("loginEmail").value.trim();

        document.getElementById("resetMessage").textContent = "";
    });

    // Return to login.
    backButton.addEventListener("click", () => {

        forgotForm.hidden = true;
        recoveryForm.hidden = true;
        loginForm.hidden = false;
    });

    // Send reset email.
    forgotForm.addEventListener("submit", async event => {

        event.preventDefault();

        const email = document.getElementById("resetEmail").value.trim();
        const message = document.getElementById("resetMessage");
        const button = document.getElementById("sendResetLinkButton");

        button.disabled = true;
        button.textContent = "Sending...";
        message.textContent = "";

        try {

            const redirectUrl =
                window.location.origin + window.location.pathname;

            const { error } = await supabaseClient.auth
                .resetPasswordForEmail(email, {
                    redirectTo: redirectUrl
                });

            if (error) throw error;

            message.style.color = "#22c55e";
            message.textContent =
                "If an account exists for this email, a password reset link has been sent. Please check your inbox.";

        } catch (error) {

            console.error("Password reset error:", error);

            message.style.color = "#f87171";
            message.textContent = error.message;

        } finally {

            button.disabled = false;
            button.textContent = "Send Reset Link";
        }
    });

    // Listen for the password recovery link.
    supabaseClient.auth.onAuthStateChange((event) => {

        if (event === "PASSWORD_RECOVERY") {

            loginForm.hidden = true;
            forgotForm.hidden = true;
            recoveryForm.hidden = false;

            document.getElementById("showRegisterButton").hidden = true;

            document.getElementById("recoveryNewPassword").focus();
        }
    });

    // Save the new password.
    recoveryForm.addEventListener("submit", async event => {

        event.preventDefault();

        const password =
            document.getElementById("recoveryNewPassword").value;

        const confirmPassword =
            document.getElementById("recoveryConfirmPassword").value;

        const message =
            document.getElementById("recoveryMessage");

        const button =
            document.getElementById("saveRecoveryPasswordButton");

        message.style.color = "#f87171";
        message.textContent = "";

        if (password.length < 8) {
            message.textContent =
                "Password must contain at least 8 characters.";
            return;
        }

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match.";
            return;
        }

        button.disabled = true;
        button.textContent = "Updating...";

        try {

            const { error } = await supabaseClient.auth.updateUser({
                password: password
            });

            if (error) throw error;

            message.style.color = "#22c55e";
            message.textContent =
                "Password updated successfully! You can now sign in with your new password.";

            await supabaseClient.auth.signOut();

            recoveryForm.reset();

            setTimeout(() => {
                recoveryForm.hidden = true;
                loginForm.hidden = false;
                document.getElementById("showRegisterButton").hidden = false;
            }, 2000);

        } catch (error) {

            console.error("Recovery password error:", error);
            message.textContent = error.message;

        } finally {

            button.disabled = false;
            button.textContent = "Update Password";
        }
    });
}



/* ------------------------------
   ROLE VERIFICATION
------------------------------ */


async function verifyUserRole(userId) {
    const { data, error } = await supabaseClient
        .from("users")
        .select("role, is_active")
        .eq("user_id", userId)
        .single();

    if (error || !data || !data.is_active) {
        console.error("Role verification failed:", error);
        return null;
    }

    const allowed = ["owner", "admin", "staff", "viewer", "customer"];

    if (!allowed.includes(data.role)) return null;

    return data.role;
}


/* ------------------------------
   SESSION
------------------------------ */

async function checkExistingSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
        currentAppRole = null;
        showLogin();
        return;
    }

    const user = data.session.user;
    currentAppRole = await verifyUserRole(user.id);

    if (currentAppRole) {
        showDashboard(user);
    } else {
        await supabaseClient.auth.signOut();
        showLogin();
    }
}

/* ------------------------------
   SHOW / HIDE SCREENS
------------------------------ */

function showLogin() {
    document.getElementById("loginScreen").hidden = false;
    document.getElementById("dashboardShell").hidden = true;

    currentUserId = null;
}

function showDashboard(user) {
    document.getElementById("loginScreen").hidden = true;
    document.getElementById("dashboardShell").hidden = false;

    currentUserId = user.id;

    setText("currentUserEmail", user.email || "User");
    setText("currentUserRole", currentAppRole.toUpperCase());

    loadNotifications();

    document.querySelectorAll(".nav-link").forEach(link => {
        const target = link.getAttribute("href");

        const managerOnly = [
            "#allocation", "#users", "#analytics"
        ].includes(target);

        link.hidden = managerOnly && !isManager();

        if (currentAppRole === "customer") {
            link.hidden = ![
                "#dashboard",
                "#rooms",
                "#bookings",
                "#settings"
            ].includes(target);
        }
    });

    const addRoom = document.getElementById("addRoomButton");
    if (addRoom) addRoom.hidden = !isManager();

    const newBooking = document.getElementById("newBookingButton");
    if (newBooking) newBooking.hidden = false;

    const bookingHeading = document.querySelector("#bookingsPage h1");
    if (bookingHeading) {
        bookingHeading.textContent =
            isManager() ? "Booking Management" : "My Bookings";
    }

    loadRooms();
    loadBookings();
    loadDashboardData();
    loadNotifications();
}

/* ------------------------------
   LOGOUT
------------------------------ */

function initializeLogout() {
    const actions = document.querySelector(".topbar-actions");

    if (!actions || document.getElementById("logoutButton")) {
        return;
    }

    const button = document.createElement("button");

    button.id = "logoutButton";
    button.className = "logout-button";
    button.type = "button";
    button.textContent = "Logout";

    button.addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            showNotification("Logout failed: " + error.message);
            return;
        }

        showLogin();
        showNotification("Logged out successfully.");
    });

    actions.appendChild(button);
}

/* ------------------------------
   NAVIGATION
------------------------------ */


function initializeNavigation() {

    const navLinks = document.querySelectorAll(".nav-link");

    const pages = {
        "#dashboard": document.getElementById("dashboard"),
        "#rooms": document.getElementById("roomsPage"),
        "#bookings": document.getElementById("bookingsPage"),
        "#allocation": document.getElementById("allocationPage"),
        "#users": document.getElementById("usersPage"),
        "#analytics": document.getElementById("analyticsPage"),
        "#settings": document.getElementById("settingsPage")
    };

    function showPage(target) {

        if (!pages[target]) {
            console.error("Page not found:", target);
            return;
        }

        // Hide every page
        Object.values(pages).forEach(page => {
            if (page) page.hidden = true;
        });

        // Show selected page
        pages[target].hidden = false;

        // Update active sidebar link
        navLinks.forEach(link => {
            link.classList.toggle(
                "active",
                link.getAttribute("href") === target
            );
        });

        // Load page data
        if (target === "#dashboard") {
            loadDashboardData();
        }

        if (target === "#rooms") {
            loadRooms();
        }

        if (target === "#bookings") {
            loadBookings();
            loadBookingRooms();
        }

        if (target === "#allocation") {
            loadPendingAllocationBookings();
        }

        if (target === "#users") {
            loadUsers();
        }

        if (target === "#analytics") {
            loadAnalytics();
        }

        if (target === "#settings") {
            loadSettings();
        }
    }

    navLinks.forEach(link => {

        link.addEventListener("click", event => {

            const target = link.getAttribute("href");

            if (!pages[target]) return;

            event.preventDefault();

            if (window.location.hash !== target) {
                history.pushState(null, "", target);
            }

            showPage(target);
        });

    });

    // Restore page when browser back/forward is used
    window.addEventListener("popstate", () => {
        const target = window.location.hash || "#dashboard";
        showPage(pages[target] ? target : "#dashboard");
    });

    // Open correct page on initial load
    const initialTarget = window.location.hash || "#dashboard";

    showPage(pages[initialTarget] ? initialTarget : "#dashboard");
}



/* ------------------------------
   DASHBOARD
------------------------------ */


function initializeDashboard() {

        // Make dashboard statistic cards clickable.
    document.querySelectorAll(".dashboard-clickable").forEach(card => {

        const navigate = () => {
            let target = card.dataset.target;

            // Customers do not have access to the Analytics page.
            // Send them to Rooms when they select Resource Utilization.
            if (target === "#analytics" && !isManager()) {
                target = "#rooms";
            }

            const navLink = document.querySelector(
                `.nav-link[href="${target}"]`
            );

            if (navLink) {
                navLink.click();
            }
        };

        card.addEventListener("click", navigate);

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate();
            }
        });

    });

    loadDashboardData();
    loadRooms();
    initializeRoomForm();

    const button = document.getElementById("newBookingButton");

    if (button) {
        button.addEventListener("click", () => {
            const bookingsLink = document.querySelector(
                '.nav-link[href="#bookings"]'
            );

            if (bookingsLink) {
                bookingsLink.click();
            }

            const addBookingButton =
                document.getElementById("addBookingButton");

            if (addBookingButton) {
                addBookingButton.click();
            }
        });
    }
}

function updateDashboardStatistics(data) {
    setText("totalRooms", data.totalRooms);
    setText("activeBookings", data.activeBookings);
    setText(
        "pendingRequests",
        String(data.pendingRequests).padStart(2, "0")
    );
    setText("utilizationRate", `${data.utilizationRate}%`);
}

function setText(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = String(value);
    }
}

/* ------------------------------
   NOTIFICATIONS
------------------------------ */

function showNotification(message) {
    let notification = document.getElementById("appNotification");

    if (!notification) {
        notification = document.createElement("div");
        notification.id = "appNotification";
        notification.setAttribute("role", "status");
        notification.setAttribute("aria-live", "polite");

        Object.assign(notification.style, {
            position: "fixed",
            right: "24px",
            bottom: "24px",
            padding: "15px 20px",
            background: "#172238",
            color: "#edf3ff",
            border: "1px solid #638cff",
            borderRadius: "12px",
            fontSize: "13px",
            zIndex: "1000"
        });

        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.hidden = false;

    if (notification.hideTimer) {
        clearTimeout(notification.hideTimer);
    }

    notification.hideTimer = setTimeout(() => {
        notification.hidden = true;
    }, 3000);
}


/* ------------------------------
   NOTIFICATION DROPDOWN
------------------------------ */

function initializeNotifications() {
    const button = document.getElementById("notificationButton");
    const panel = document.getElementById("notificationPanel");
    const closeButton = document.getElementById("closeNotifications");

    if (!button || !panel) {
        console.error("Notification HTML elements not found.");
        return;
    }

    if (button.dataset.notificationInitialized === "true") {
        return;
    }

    button.dataset.notificationInitialized = "true";

    button.addEventListener("click", async () => {
        const isOpening = panel.hidden;

        panel.hidden = !isOpening;
        button.setAttribute("aria-expanded", String(isOpening));

        if (isOpening) {
            await loadNotifications();
        }
    });

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            panel.hidden = true;
            button.setAttribute("aria-expanded", "false");
        });
    }

    document.addEventListener("click", event => {
        if (!event.target.closest(".notification-wrapper")) {
            panel.hidden = true;
            button.setAttribute("aria-expanded", "false");
        }
    });
}

/* MARK NOTIFICATION AS READ */

async function markNotificationRead(notificationId) {

    try {

        const { data: authData, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError) throw authError;

        const userId = authData.user?.id;

        if (!userId) return;

        const { error } = await supabaseClient
            .from("notifications")
            .update({ is_read: true })
            .eq("notification_id", notificationId)
            .eq("user_id", userId);

        if (error) throw error;

        await loadNotifications();

    } catch (error) {

        console.error("Mark notification read error:", error);

    }
}



async function loadDashboardData() {
    try {
        const [
            roomsResult,
            activeResult,
            pendingResult,
            bookingsResult
        ] = await Promise.all([
            supabaseClient
                .from("rooms")
                .select("*", { count: "exact", head: true }),

            supabaseClient
                .from("bookings")
                .select("*", { count: "exact", head: true })
                .eq("status", "confirmed"),

            supabaseClient
                .from("bookings")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending"),

            supabaseClient
                .from("bookings")
                .select("booking_id, room_id, purpose, start_at, end_at, status")
                .order("created_at", { ascending: false })
                .limit(5)
        ]);

        if (roomsResult.error) throw roomsResult.error;
        if (activeResult.error) throw activeResult.error;
        if (pendingResult.error) throw pendingResult.error;
        if (bookingsResult.error) throw bookingsResult.error;

        setText("totalRooms", roomsResult.count ?? 0);
        setText("activeBookings", activeResult.count ?? 0);
        setText("pendingRequests", pendingResult.count ?? 0);

        renderRecentBookings(bookingsResult.data || []);

    } catch (error) {
        console.error("Dashboard loading error:", error);
        showNotification("Unable to load dashboard data: " + error.message);
    }
}

function renderRecentBookings(bookings) {
    const tableBody = document.getElementById("bookingTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (bookings.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No bookings found.";

        row.appendChild(cell);
        tableBody.appendChild(row);

        // Actions column
        const actionsCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.className = "room-edit-button";

        editButton.addEventListener("click", () => {
            editRoom(room);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "room-delete-button";

        deleteButton.addEventListener("click", () => {
            deleteRoom(room.room_id);
        });

        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
        row.appendChild(actionsCell);

        return;
    }

    bookings.forEach(booking => {
        const row = document.createElement("tr");

        const start = booking.start_at
            ? new Date(booking.start_at).toLocaleString()
            : "Not specified";

        const end = booking.end_at
            ? new Date(booking.end_at).toLocaleTimeString()
            : "";

        const values = [
            booking.booking_id,
            booking.room_id,
            end ? `${start} - ${end}` : start,
            booking.purpose,
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value || "—";
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");

        const status = (booking.status || "unknown").toLowerCase();

        statusBadge.classList.add("status-badge");

        if (status === "confirmed" || status === "pending") {
            statusBadge.classList.add("status-" + status);
        }

        statusBadge.textContent =
            status.charAt(0).toUpperCase() + status.slice(1);

        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        tableBody.appendChild(row);
    });
}


async function loadRooms() {

    const tableBody = document.getElementById("roomsTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="8">Loading rooms...</td>
        </tr>
    `;

    try {

        const { data: rooms, error } = await supabaseClient
            .from("rooms")
            .select("*")
            .order("room_id", { ascending: true });

        if (error) throw error;

        tableBody.replaceChildren();

        if (!rooms || rooms.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">No rooms found.</td>
                </tr>
            `;

            return;
        }

        rooms.forEach(room => {

            const row = document.createElement("tr");

            const values = [
                room.room_id,
                room.room_name,
                room.room_type,
                room.capacity,
                room.has_projector ? "Yes" : "No",
                room.has_computers ? "Yes" : "No",
                room.is_active ? "Active" : "Inactive"
            ];

            values.forEach(value => {

                const cell = document.createElement("td");

                cell.textContent = value ?? "—";

                row.appendChild(cell);

            });

            // ACTIONS COLUMN
            const actionsCell = document.createElement("td");

            // Only owner/admin can edit or delete rooms.
            if (isManager()) {

                const editButton = document.createElement("button");

                editButton.type = "button";
                editButton.textContent = "Edit";
                editButton.className = "room-edit-button";

                editButton.addEventListener("click", () => {
                    editRoom(room);
                });

                const deleteButton = document.createElement("button");

                deleteButton.type = "button";
                deleteButton.textContent = "Delete";
                deleteButton.className = "room-delete-button";

                deleteButton.addEventListener("click", () => {
                    deleteRoom(room.room_id);
                });

                actionsCell.appendChild(editButton);
                actionsCell.appendChild(deleteButton);

            } else {

                actionsCell.textContent = "—";

            }

            row.appendChild(actionsCell);

            tableBody.appendChild(row);

        });

    } catch (error) {

        console.error("Room loading error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">Unable to load rooms.</td>
            </tr>
        `;

        showNotification("Room loading failed: " + error.message);

    }

}


function initializeRoomForm() {
    const addButton = document.getElementById("addRoomButton");
    const cancelButton = document.getElementById("cancelRoomButton");
    const formPanel = document.getElementById("roomFormPanel");
    const form = document.getElementById("roomForm");

    if (!addButton || !cancelButton || !formPanel || !form) return;

    addButton.addEventListener("click", () => {
        formPanel.hidden = false;
        document.getElementById("roomFormMessage").textContent = "";
        document.getElementById("roomId").focus();
    });

    cancelButton.addEventListener("click", () => {
        form.reset();
        formPanel.hidden = true;
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = document.getElementById("roomFormMessage");
        const saveButton = form.querySelector('button[type="submit"]');

        const room = {
            room_id: document.getElementById("roomId").value.trim(),
            room_name: document.getElementById("roomName").value.trim(),
            room_type: document.getElementById("roomType").value,
            capacity: Number(document.getElementById("roomCapacity").value),
            has_projector: document.getElementById("roomProjector").checked,
            has_computers: document.getElementById("roomComputers").checked,
            is_active: true
        };

        if (!room.room_id || !room.room_name || !room.room_type ||
            !Number.isInteger(room.capacity) || room.capacity < 1) {
            message.textContent = "Please enter valid room details.";
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
        message.textContent = "";

        try {
            let error;

            if (editingRoomId) {
                const result = await supabaseClient
                    .from("rooms")
                    .update(room)
                    .eq("room_id", editingRoomId);

                error = result.error;
            } else {
                const result = await supabaseClient
                    .from("rooms")
                    .insert([room]);

                error = result.error;
            }

            if (error) throw error;

            const wasEditing = Boolean(editingRoomId);

            message.textContent = wasEditing
                ? "Room updated successfully!"
                : "Room added successfully!";

            editingRoomId = null;

            document.getElementById("roomId").readOnly = false;
            editingRoomId = null;
            document.getElementById("roomId").readOnly = false;
            form.reset();
            formPanel.hidden = true;

            document.querySelector("#roomFormPanel h2").textContent =
                "Add New Room";

            await loadRooms();
            await loadDashboardData();

            showNotification(
                wasEditing ? "Room updated successfully!" : "Room added successfully!"
            );

        } catch (error) {
            console.error("Room save error:", error);
            message.textContent = "Failed to save room: " + error.message;
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = editingRoomId ? "Update Room" : "Save Room";
        }
    });
}

function editRoom(room) {
    editingRoomId = room.room_id;

    document.getElementById("roomId").value = room.room_id;
    document.getElementById("roomId").readOnly = true;

    document.getElementById("roomName").value = room.room_name || "";
    document.getElementById("roomType").value = room.room_type || "";
    document.getElementById("roomCapacity").value = room.capacity || 1;
    document.getElementById("roomProjector").checked = room.has_projector;
    document.getElementById("roomComputers").checked = room.has_computers;

    document.querySelector("#roomFormPanel h2").textContent = "Edit Room";

    document.querySelector('#roomForm button[type="submit"]').textContent =
        "Update Room";

    document.getElementById("roomFormMessage").textContent = "";

    document.getElementById("roomFormPanel").hidden = false;

    document.getElementById("roomName").focus();
}

async function deleteRoom(roomId) {
    const confirmed = confirm(
        `Are you sure you want to delete room ${roomId}?`
    );

    if (!confirmed) return;

    try {
        // Prevent deletion if this room has bookings.
        const { count, error: checkError } = await supabaseClient
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("room_id", roomId);

        if (checkError) throw checkError;

        if (count > 0) {
            showNotification(
                "Cannot delete this room because bookings are associated with it."
            );
            return;
        }

        const { error } = await supabaseClient
            .from("rooms")
            .delete()
            .eq("room_id", roomId);

        if (error) throw error;

        showNotification("Room deleted successfully!");

        await loadRooms();
        await loadDashboardData();

    } catch (error) {
        console.error("Delete room error:", error);
        showNotification("Delete failed: " + error.message);
    }
}


// ==========================================
// BOOKING MANAGEMENT
// ==========================================

// Load rooms into the booking dropdown.
async function loadBookingRooms() {
    const roomSelect = document.getElementById("bookingRoom");

    if (!roomSelect) return;

    roomSelect.innerHTML = '<option value="">Loading rooms...</option>';

    try {
        const { data: rooms, error } = await supabaseClient
            .from("rooms")
            .select("room_id, room_name, is_active")
            .eq("is_active", true)
            .order("room_id");

        if (error) throw error;

        roomSelect.innerHTML = '<option value="">Select a room</option>';

        if (!rooms || rooms.length === 0) {
            roomSelect.innerHTML = '<option value="">No active rooms available</option>';
            return;
        }

        rooms.forEach(room => {
            const option = document.createElement("option");
            option.value = room.room_id;
            option.textContent = `${room.room_id} - ${room.room_name}`;
            roomSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Room dropdown error:", error);
        roomSelect.innerHTML = '<option value="">Unable to load rooms</option>';
        showNotification("Unable to load rooms: " + error.message);
    }
}


// Load all bookings from Supabase.

async function loadBookings() {
    const tableBody = document.getElementById("bookingsTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr><td colspan="7">Loading bookings...</td></tr>
    `;

    try {
        let bookings = [];

        if (!isManager()) {
            const { data: authData, error: authError } =
                await supabaseClient.auth.getUser();

            if (authError) throw authError;

            const user = authData.user;

            if (!user) throw new Error("Please log in again.");

            const { data, error } = await supabaseClient
                .from("bookings")
                .select("*")
                .eq("booked_by", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            bookings = data || [];

        } else {
            const { data, error } = await supabaseClient
                .from("bookings")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            bookings = data || [];
        }

        tableBody.replaceChildren();

        if (bookings.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="7">No bookings found.</td></tr>
            `;
            return;
        }

        bookings.forEach(booking => {
            const row = document.createElement("tr");

            const status = (booking.status || "unknown").toLowerCase();

            // Booking information
            const values = [
                booking.booking_id,
                booking.room_id,
                booking.purpose,
                formatBookingDate(booking.start_at),
                formatBookingDate(booking.end_at)
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value || "—";
                row.appendChild(cell);
            });

            // Status
            const statusCell = document.createElement("td");
            const statusBadge = document.createElement("span");

            statusBadge.classList.add("status-badge");

            if (["pending", "confirmed", "rejected"].includes(status)) {
                statusBadge.classList.add("status-" + status);
            }

            statusBadge.textContent =
                status.charAt(0).toUpperCase() + status.slice(1);

            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);

            // Actions
            const actionsCell = document.createElement("td");

            if (isManager()) {

                if (status === "pending") {
                    const approveButton = document.createElement("button");

                    approveButton.type = "button";
                    approveButton.textContent = "Approve";
                    approveButton.className = "room-edit-button";

                    approveButton.addEventListener("click", () => {
                        updateBookingStatus(
                            booking.booking_id,
                            "confirmed"
                        );
                    });

                    const rejectButton = document.createElement("button");

                    rejectButton.type = "button";
                    rejectButton.textContent = "Reject";
                    rejectButton.className = "room-delete-button";

                    rejectButton.addEventListener("click", () => {
                        updateBookingStatus(
                            booking.booking_id,
                            "rejected"
                        );
                    });

                    actionsCell.append(approveButton, rejectButton);
                }

                const deleteButton = document.createElement("button");

                deleteButton.type = "button";
                deleteButton.textContent = "Delete";
                deleteButton.className = "room-delete-button";

                deleteButton.addEventListener("click", () => {
                    deleteBooking(booking.booking_id);
                });

                actionsCell.appendChild(deleteButton);

            } else if (status === "pending") {

                // CUSTOMER: EDIT
                const editButton = document.createElement("button");

                editButton.type = "button";
                editButton.textContent = "Edit";
                editButton.className = "room-edit-button";

                editButton.addEventListener("click", () => {
                    editCustomerBooking(booking);
                });

                // CUSTOMER: DELETE
                const deleteButton = document.createElement("button");

                deleteButton.type = "button";
                deleteButton.textContent = "Delete";
                deleteButton.className = "room-delete-button";

                deleteButton.addEventListener("click", () => {
                    deleteCustomerBooking(booking.booking_id);
                });

                actionsCell.append(editButton, deleteButton);

            } else {
                actionsCell.textContent = "—";
            }

            row.appendChild(actionsCell);
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Booking loading error:", error);

        tableBody.innerHTML = `
            <tr><td colspan="7">Unable to load bookings.</td></tr>
        `;

        showNotification(
            "Booking loading failed: " + error.message
        );
    }
}

// Convert database date into datetime-local input format.
function toDateTimeLocal(dateValue) {
    const date = new Date(dateValue);

    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset)
        .toISOString()
        .slice(0, 16);
}


// Open the existing booking form for editing.
async function editCustomerBooking(booking) {

    if (isManager() || booking.status !== "pending") {
        showNotification("Only your pending bookings can be edited.");
        return;
    }

    editingBookingId = booking.booking_id;

    const form = document.getElementById("bookingForm");
    const formPanel = document.getElementById("bookingFormPanel");

    if (!form || !formPanel) return;

    form.reset();

    document.getElementById("bookingFormMessage").textContent = "";

    await loadBookingRooms();

    document.getElementById("bookingRoom").value = booking.room_id;
    document.getElementById("bookingPurpose").value = booking.purpose || "";
    document.getElementById("bookingStart").value =
        toDateTimeLocal(booking.start_at);
    document.getElementById("bookingEnd").value =
        toDateTimeLocal(booking.end_at);

    document.getElementById("saveBookingButton").textContent =
        "Update Booking";

    formPanel.hidden = false;

    document.getElementById("bookingPurpose").focus();
}


// Delete only the logged-in customer's own pending booking.
async function deleteCustomerBooking(bookingId) {

    if (isManager()) return;

    const confirmed = confirm(
        "Are you sure you want to delete this pending booking?"
    );

    if (!confirmed) return;

    try {
        const { data: authData, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError) throw authError;

        const user = authData.user;

        if (!user) throw new Error("Please log in again.");

        const { data, error } = await supabaseClient
            .from("bookings")
            .delete()
            .eq("booking_id", bookingId)
            .eq("booked_by", user.id)
            .eq("status", "pending")
            .select("booking_id")
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "Booking could not be deleted. It may no longer be pending."
            );
        }

        showNotification("Booking deleted successfully!");

        await loadBookings();
        await loadDashboardData();

    } catch (error) {
        console.error("Customer booking deletion error:", error);
        showNotification("Delete failed: " + error.message);
    }
}

// ==========================================
// SMART ALLOCATION MODULE
// ==========================================

let allocationRecommendations = [];

async function loadPendingAllocationBookings() {
    const select = document.getElementById("allocationBooking");

    try {
        const { data, error } = await supabaseClient
            .from("bookings")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) throw error;

        select.innerHTML = '<option value="">Select a pending booking</option>';

        (data || []).forEach(booking => {
            const option = document.createElement("option");
            option.value = booking.booking_id;

            const start = new Date(booking.start_at).toLocaleString();

            option.textContent =
                `${booking.booking_id} — ${booking.purpose} (${start})`;

            select.appendChild(option);
        });

        if (!data || data.length === 0) {
            select.innerHTML =
                '<option value="">No pending bookings available</option>';
        }
    } catch (error) {
        console.error("Pending booking load error:", error);
        select.innerHTML =
            '<option value="">Unable to load bookings</option>';
    }
}


async function findBestAllocations() {
    const bookingId =
        document.getElementById("allocationBooking").value;

    const requiredCapacity = Number(
        document.getElementById("requiredCapacity").value
    );

    const requiredType =
        document.getElementById("requiredRoomType").value;

    const needProjector =
        document.getElementById("requireProjector").checked;

    const needComputers =
        document.getElementById("requireComputers").checked;

    const message = document.getElementById("allocationMessage");
    const results = document.getElementById("allocationResults");

    if (!bookingId) {
        message.textContent = "Please select a pending booking.";
        return;
    }

    if (!Number.isInteger(requiredCapacity) || requiredCapacity < 1) {
        message.textContent = "Enter a valid minimum capacity.";
        return;
    }

    message.textContent = "Searching for suitable rooms...";
    results.innerHTML = "";

    try {
        // 1. Get the selected booking
        const { data: booking, error: bookingError } = await supabaseClient
            .from("bookings")
            .select("*")
            .eq("booking_id", bookingId)
            .eq("status", "pending")
            .single();

        if (bookingError) throw bookingError;

        // 2. Get active rooms
        const { data: rooms, error: roomsError } = await supabaseClient
            .from("rooms")
            .select("*")
            .eq("is_active", true);

        if (roomsError) throw roomsError;

        // 3. Get all bookings that may block the requested time
        const { data: existingBookings, error: existingError } =
            await supabaseClient
                .from("bookings")
                .select("booking_id, room_id, start_at, end_at, status")
                .in("status", ["pending", "confirmed"])
                .lt("start_at", booking.end_at)
                .gt("end_at", booking.start_at);

        if (existingError) throw existingError;

        // 4. Find rooms that are free and meet requirements
        const suitableRooms = (rooms || []).filter(room => {
            if (Number(room.capacity) < requiredCapacity) return false;

            if (needProjector && !room.has_projector) return false;

            if (needComputers && !room.has_computers) return false;

            const isOccupied = (existingBookings || []).some(existing => {
                return existing.room_id === room.room_id &&
                    existing.booking_id !== booking.booking_id;
            });

            return !isOccupied;
        });

        // 5. Rank rooms
        allocationRecommendations = suitableRooms.map(room => {
            let score = 100;

            // Prefer a room with less unused capacity
            const unusedCapacity =
                Number(room.capacity) - requiredCapacity;

            score -= Math.min(unusedCapacity * 0.5, 40);

            // Preferred room type gets bonus points
            if (requiredType) {
                if (room.room_type === requiredType) {
                    score += 15;
                } else {
                    score -= 15;
                }
            }

            // Facility match bonuses
            if (needProjector && room.has_projector) score += 5;
            if (needComputers && room.has_computers) score += 5;

            return {
                ...room,
                score: Math.max(0, Math.round(score))
            };
        });

        // Highest score first; smaller room wins ties
        allocationRecommendations.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return Number(a.capacity) - Number(b.capacity);
        });

        renderAllocationResults();

        if (allocationRecommendations.length === 0) {
            message.textContent =
                "No available room meets all the selected requirements.";
        } else {
            message.textContent =
                `${allocationRecommendations.length} suitable room(s) found. Best match is ranked first.`;
        }

    } catch (error) {
        console.error("Allocation error:", error);
        message.textContent =
            "Unable to find rooms: " + error.message;
    }
}


function renderAllocationResults() {
    const results = document.getElementById("allocationResults");

    if (allocationRecommendations.length === 0) {
        results.innerHTML =
            '<tr><td colspan="7">No suitable rooms found.</td></tr>';
        return;
    }

    results.innerHTML = allocationRecommendations.map((room, index) => {
        const facilities = [
            room.has_projector ? "Projector" : "",
            room.has_computers ? "Computers" : ""
        ].filter(Boolean).join(", ") || "None";

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(room.room_name)} (${escapeHTML(room.room_id)})</td>
                <td>${escapeHTML(room.room_type)}</td>
                <td>${Number(room.capacity)}</td>
                <td>${escapeHTML(facilities)}</td>
                <td>${room.score}/100</td>
                <td>
                    <button
                        class="btn btn-primary"
                        onclick="allocateRoom('${encodeURIComponent(room.room_id)}')">
                        Allocate
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}


// Escape database text before inserting it into HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


async function allocateRoom(encodedRoomId) {
    const roomId = decodeURIComponent(encodedRoomId);
    const bookingId =
        document.getElementById("allocationBooking").value;

    if (!bookingId) {
        alert("Please select a booking first.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to allocate room ${roomId} to booking ${bookingId}?`
    );

    if (!confirmed) return;

    try {
        // 1. Verify booking is still pending
        const { data: booking, error: bookingError } = await supabaseClient
            .from("bookings")
            .select("*")
            .eq("booking_id", bookingId)
            .eq("status", "pending")
            .single();

        if (bookingError) throw bookingError;

        // 2. Verify room is still active
        const { data: room, error: roomError } = await supabaseClient
            .from("rooms")
            .select("*")
            .eq("room_id", roomId)
            .eq("is_active", true)
            .single();

        if (roomError) throw roomError;

        // 3. Recheck room availability immediately before allocation
        const { data: conflicts, error: conflictError } = await supabaseClient
            .from("bookings")
            .select("booking_id")
            .eq("room_id", roomId)
            .in("status", ["pending", "confirmed"])
            .neq("booking_id", bookingId)
            .lt("start_at", booking.end_at)
            .gt("end_at", booking.start_at);

        if (conflictError) throw conflictError;

        if (conflicts && conflicts.length > 0) {
            alert("This room has just become unavailable. Please search again.");
            await findBestAllocations();
            return;
        }

        // 4. Update the booking with the recommended room
        const { error: updateError } = await supabaseClient
            .from("bookings")
            .update({ room_id: roomId })
            .eq("booking_id", bookingId)
            .eq("status", "pending");

        if (updateError) throw updateError;

        alert(`Room ${room.room_name} allocated successfully!`);

        // 5. Refresh data
        await loadPendingAllocationBookings();
        await loadBookings();
        await loadDashboardData();

        document.getElementById("allocationResults").innerHTML =
            '<tr><td colspan="7">Allocation completed. Select another booking to continue.</td></tr>';

        document.getElementById("allocationMessage").textContent =
            "Room successfully allocated.";

        allocationRecommendations = [];

    } catch (error) {
        console.error("Room allocation error:", error);
        alert("Allocation failed: " + error.message);
    }
}


// Initialize Smart Allocation controls
function initializeSmartAllocation() {
    const button = document.getElementById("findAllocationButton");

    if (button) {
        button.addEventListener("click", findBestAllocations);
    }
}


// Format dates for display.
function formatBookingDate(dateValue) {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleString();
}


// Open and close the booking form.
function initializeBookingForm() {

    const addButton = document.getElementById("addBookingButton");
    const cancelButton = document.getElementById("cancelBookingButton");
    const formPanel = document.getElementById("bookingFormPanel");
    const form = document.getElementById("bookingForm");

    if (!addButton || !cancelButton || !formPanel || !form) return;

    const message = document.getElementById("bookingFormMessage");
    const saveButton = document.getElementById("saveBookingButton");

    // CREATE NEW BOOKING
    addButton.addEventListener("click", async () => {

        editingBookingId = null;

        form.reset();

        message.textContent = "";
        saveButton.textContent = "Create Booking";

        formPanel.hidden = false;

        await loadBookingRooms();

        document.getElementById("bookingPurpose").focus();
    });


    // CANCEL FORM
    cancelButton.addEventListener("click", () => {

        editingBookingId = null;

        form.reset();

        formPanel.hidden = true;

        message.textContent = "";
        saveButton.textContent = "Create Booking";
    });


    // CREATE OR UPDATE BOOKING
    form.addEventListener("submit", async event => {

        event.preventDefault();

        const roomId = document.getElementById("bookingRoom").value;
        const purpose = document.getElementById("bookingPurpose").value.trim();

        const startValue = document.getElementById("bookingStart").value;
        const endValue = document.getElementById("bookingEnd").value;

        const startDate = new Date(startValue);
        const endDate = new Date(endValue);

        if (!roomId || !purpose || !startValue || !endValue) {
            message.textContent = "Please fill in all booking details.";
            return;
        }

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            endDate <= startDate
        ) {
            message.textContent = "End time must be later than start time.";
            return;
        }

        const isEditing = Boolean(editingBookingId);

        saveButton.disabled = true;
        saveButton.textContent = isEditing ? "Updating..." : "Creating...";
        message.textContent = "";

        try {

            const { data: userData, error: userError } =
                await supabaseClient.auth.getUser();

            if (userError) throw userError;

            const user = userData.user;

            if (!user) {
                throw new Error("Please sign in again.");
            }

            const startISO = startDate.toISOString();
            const endISO = endDate.toISOString();

            // Check for overlapping bookings.
            let conflictQuery = supabaseClient
                .from("bookings")
                .select("booking_id")
                .eq("room_id", roomId)
                .in("status", ["pending", "confirmed"])
                .lt("start_at", endISO)
                .gt("end_at", startISO);

            // Do not count the booking currently being edited.
            if (isEditing) {
                conflictQuery = conflictQuery.neq(
                    "booking_id",
                    editingBookingId
                );
            }

            const { data: conflicts, error: conflictError } =
                await conflictQuery;

            if (conflictError) throw conflictError;

            if (conflicts && conflicts.length > 0) {
                throw new Error(
                    "This room already has a booking during the selected time."
                );
            }

            let error;

            if (isEditing) {

                // UPDATE EXISTING PENDING BOOKING.
                const result = await supabaseClient
                    .from("bookings")
                    .update({
                        room_id: roomId,
                        purpose: purpose,
                        start_at: startISO,
                        end_at: endISO
                    })
                    .eq("booking_id", editingBookingId)
                    .eq("booked_by", user.id)
                    .eq("status", "pending")
                    .select("booking_id")
                    .maybeSingle();

                error = result.error;

                if (error) throw error;

                if (!result.data) {
                    throw new Error(
                        "Booking could not be updated. It may no longer be pending."
                    );
                }

            } else {

                // CREATE NEW BOOKING.
                const booking = {
                    booking_id: "BOOK-" + Date.now(),
                    room_id: roomId,
                    booked_by: user.id,
                    purpose: purpose,
                    start_at: startISO,
                    end_at: endISO,
                    status: "pending"
                };

                const result = await supabaseClient
                    .from("bookings")
                    .insert([booking]);

                error = result.error;

                if (error) throw error;
            }

            editingBookingId = null;

            form.reset();
            formPanel.hidden = true;

            saveButton.textContent = "Create Booking";

            await loadBookings();
            await loadDashboardData();

            showNotification(
                isEditing
                    ? "Booking updated successfully!"
                    : "Booking created successfully!"
            );

        } catch (error) {

            console.error("Booking save error:", error);

            message.textContent =
                (isEditing ? "Update failed: " : "Booking failed: ") +
                error.message;

        } finally {

            saveButton.disabled = false;

            saveButton.textContent =
                editingBookingId ? "Update Booking" : "Create Booking";
        }
    });
}

// Approve or reject a pending booking.
async function updateBookingStatus(bookingId, newStatus) {
    if (!["confirmed", "rejected"].includes(newStatus)) return;

    const action = newStatus === "confirmed" ? "approve" : "reject";

    if (!confirm(`Are you sure you want to ${action} this booking?`)) {
        return;
    }

    try {
        // Recheck room availability before approving.
        if (newStatus === "confirmed") {
            const { data: booking, error: bookingError } =
                await supabaseClient
                    .from("bookings")
                    .select("room_id, start_at, end_at, status")
                    .eq("booking_id", bookingId)
                    .single();

            if (bookingError) throw bookingError;

            if (booking.status !== "pending") {
                throw new Error("This booking is no longer pending.");
            }

            const { data: conflicts, error: conflictError } =
                await supabaseClient
                    .from("bookings")
                    .select("booking_id")
                    .eq("room_id", booking.room_id)
                    .neq("booking_id", bookingId)
                    .in("status", ["pending", "confirmed"])
                    .lt("start_at", booking.end_at)
                    .gt("end_at", booking.start_at);

            if (conflictError) throw conflictError;

            if (conflicts && conflicts.length > 0) {
                throw new Error(
                    "Cannot approve: another pending or confirmed booking overlaps this time."
                );
            }
        }

        const { error } = await supabaseClient
            .from("bookings")
            .update({ status: newStatus })
            .eq("booking_id", bookingId)
            .eq("status", "pending");

        if (error) throw error;

        showNotification(
            newStatus === "confirmed"
                ? "Booking approved successfully!"
                : "Booking rejected successfully!"
        );

        await loadBookings();
        await loadDashboardData();

    } catch (error) {
        console.error("Booking status error:", error);
        showNotification("Status update failed: " + error.message);
    }
}


// Delete a booking.
async function deleteBooking(bookingId) {
    if (!confirm(`Are you sure you want to delete booking ${bookingId}?`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from("bookings")
            .delete()
            .eq("booking_id", bookingId);

        if (error) throw error;

        showNotification("Booking deleted successfully!");

        await loadBookings();
        await loadDashboardData();

    } catch (error) {
        console.error("Delete booking error:", error);
        showNotification("Booking deletion failed: " + error.message);
    }
}



function initializeRegistration() {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const showRegister = document.getElementById("showRegisterButton");
    const showLogin = document.getElementById("showLoginButton");

    if (!registerForm || !showRegister || !showLogin) return;

    showRegister.addEventListener("click", () => {
        loginForm.hidden = true;
        showRegister.hidden = true;
        registerForm.hidden = false;
    });

    showLogin.addEventListener("click", () => {
        registerForm.hidden = true;
        loginForm.hidden = false;
        showRegister.hidden = false;
    });

    registerForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        const message = document.getElementById("registerMessage");

        message.textContent = "Creating account...";

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (error) {
            message.textContent = error.message;
            return;
        }

        if (data.session && data.user) {
            currentAppRole = await verifyUserRole(data.user.id);

            if (currentAppRole !== "customer") {
                await supabaseClient.auth.signOut();
                currentAppRole = null;
                message.textContent = "Customer account setup failed.";
                return;
            }

            showDashboard(data.user);
            return;
        }

        message.textContent =
            "Registration successful! Check your email to confirm your account, then sign in.";
    });
}



/* ------------------------------
   USERS MANAGEMENT
------------------------------ */

async function loadUsers() {

    const tableBody = document.getElementById("usersTableBody");

    if (!tableBody) return;

    // Attach event handlers only once.
    if (!tableBody.dataset.handlersBound) {

        tableBody.dataset.handlersBound = "true";

        tableBody.addEventListener("click", async event => {

            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const userId = button.dataset.userId;
            const action = button.dataset.action;

            if (action === "save-role") {

                const row = button.closest("tr");
                const roleSelect = row.querySelector(".user-role-select");

                await updateManagedUserRole(
                    userId,
                    roleSelect.value
                );
            }

            if (action === "toggle-status") {

                const isActive = button.dataset.active === "true";

                await updateManagedUserStatus(
                    userId,
                    !isActive
                );
            }

        });

    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="6">Loading users...</td>
        </tr>
    `;

    try {

        const { data: users, error } = await supabaseClient
            .from("users")
            .select("user_id, username, email, role, is_active, created_at")
            .order("created_at", { ascending: false });

        if (error) throw error;

        setText("totalUsers", users.length);

        setText(
            "totalAdmins",
            users.filter(user =>
                user.role?.toLowerCase() === "admin"
            ).length
        );

        setText(
            "totalCustomers",
            users.filter(user =>
                user.role?.toLowerCase() === "customer"
            ).length
        );

        setText(
            "inactiveUsers",
            users.filter(user =>
                user.is_active === false
            ).length
        );

        tableBody.innerHTML = "";

        if (users.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">No users found.</td>
                </tr>
            `;

            return;
        }

        users.forEach(user => {

            const row = document.createElement("tr");

            const values = [
                user.username || "—",
                user.email || "—",
                user.role || "—",
                user.is_active ? "Active" : "Inactive",
                user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "—"
            ];

            values.forEach(value => {

                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);

            });

            const actionsCell = document.createElement("td");

            // Never display management controls for Owner.
            if (user.role?.toLowerCase() === "owner") {

                actionsCell.textContent = "Protected Owner";

            } else {

                // Role selector
                const roleSelect = document.createElement("select");

                roleSelect.className = "user-role-select";

                ["customer", "admin"].forEach(role => {

                    const option = document.createElement("option");

                    option.value = role;
                    option.textContent =
                        role.charAt(0).toUpperCase() + role.slice(1);

                    if (user.role?.toLowerCase() === role) {
                        option.selected = true;
                    }

                    roleSelect.appendChild(option);

                });

                actionsCell.appendChild(roleSelect);

                // Save role button
                const saveButton = document.createElement("button");

                saveButton.type = "button";
                saveButton.textContent = "Save Role";
                saveButton.className = "room-edit-button";
                saveButton.dataset.action = "save-role";
                saveButton.dataset.userId = user.user_id;

                actionsCell.appendChild(saveButton);

                // Activate / Deactivate button
                const statusButton = document.createElement("button");

                statusButton.type = "button";
                statusButton.textContent =
                    user.is_active ? "Deactivate" : "Activate";

                statusButton.className = "room-delete-button";
                statusButton.dataset.action = "toggle-status";
                statusButton.dataset.userId = user.user_id;
                statusButton.dataset.active = String(user.is_active);

                actionsCell.appendChild(statusButton);

            }

            row.appendChild(actionsCell);
            tableBody.appendChild(row);

        });

    } catch (error) {

        console.error("Users loading error:", error);

        tableBody.innerHTML = "";

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = "Unable to load users: " + error.message;

        row.appendChild(cell);
        tableBody.appendChild(row);

        showNotification("Unable to load users.");

    }

}


/* ------------------------------
   CHANGE USER ROLE
------------------------------ */

async function updateManagedUserRole(userId, newRole) {

    if (!["admin", "customer"].includes(newRole)) {
        showNotification("Invalid role selected.");
        return;
    }

    if (!confirm(`Change this user's role to ${newRole}?`)) {
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("users")
            .update({
                role: newRole,
                updated_at: new Date().toISOString()
            })
            .eq("user_id", userId)
            .neq("role", "owner")
            .select("user_id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("No user was updated. Check your permissions.");
        }

        showNotification("User role updated successfully!");

        await loadUsers();

    } catch (error) {

        console.error("Role update error:", error);

        showNotification("Role update failed: " + error.message);

    }

}


/* ------------------------------
   ACTIVATE / DEACTIVATE USER
------------------------------ */

async function updateManagedUserStatus(userId, newStatus) {

    const action = newStatus ? "activate" : "deactivate";

    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("users")
            .update({
                is_active: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq("user_id", userId)
            .neq("role", "owner")
            .select("user_id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("No user was updated. Check your permissions.");
        }

        showNotification(
            newStatus
                ? "User activated successfully!"
                : "User deactivated successfully!"
        );

        await loadUsers();

    } catch (error) {

        console.error("User status update error:", error);

        showNotification("Status update failed: " + error.message);

    }

}



async function loadAnalytics() {
    const totalBookingsEl = document.getElementById("analyticsTotalBookings");
    const confirmedEl = document.getElementById("analyticsConfirmed");
    const pendingEl = document.getElementById("analyticsPending");
    const rejectedEl = document.getElementById("analyticsRejected");
    const summaryEl = document.getElementById("analyticsBookingSummary");
    const roomTable = document.getElementById("analyticsRoomTable");

    try {
        summaryEl.textContent = "Loading analytics...";
        roomTable.innerHTML = `
            <tr><td colspan="4">Loading room statistics...</td></tr>
        `;

        // Fetch bookings from Supabase
        const { data: bookings, error: bookingsError } =
            await supabaseClient
                .from("bookings")
                .select("booking_id, room_id, status, created_at");

        if (bookingsError) throw bookingsError;

        // Fetch rooms from Supabase
        const { data: rooms, error: roomsError } =
            await supabaseClient
                .from("rooms")
                .select("room_id");

        if (roomsError) throw roomsError;

        // Calculate booking statistics
        const total = bookings.length;

        // Calculate room usage statistics
        const totalRooms = rooms.length;

        // Count rooms that have at least one pending or confirmed booking
        const bookedRoomIds = new Set(
            bookings
                .filter(booking =>
                    booking.status === "pending" ||
                    booking.status === "confirmed"
                )
                .map(booking => booking.room_id)
        );

        const bookedRooms = rooms.filter(
            room => bookedRoomIds.has(room.room_id)
        ).length;

        const unusedRooms = totalRooms - bookedRooms;

        const usageRate = totalRooms > 0
            ? Math.round((bookedRooms / totalRooms) * 100)
            : 0;

        // Update Room Utilization cards
        document.getElementById("utilTotalRooms").textContent = totalRooms;
        document.getElementById("utilBookedRooms").textContent = bookedRooms;
        document.getElementById("utilUnusedRooms").textContent = unusedRooms;
        document.getElementById("utilUsageRate").textContent = `${usageRate}%`;



        // Group bookings by creation date
        const bookingsByDate = {};

        bookings.forEach(booking => {
            if (!booking.created_at) return;

            const date = new Date(booking.created_at)
                .toLocaleDateString("en-CA");

            bookingsByDate[date] = (bookingsByDate[date] || 0) + 1;
        });

        // Sort dates and keep the latest 7 dates with bookings
        const trendDates = Object.keys(bookingsByDate)
            .sort()
            .slice(-7);

        const trendsContainer = document.getElementById("bookingTrendsChart");
        trendsContainer.replaceChildren();

        if (trendDates.length === 0) {
            trendsContainer.textContent = "No booking history available.";
        } else {
            const maxBookings = Math.max(
                ...trendDates.map(date => bookingsByDate[date])
            );

            trendDates.forEach(date => {
                const count = bookingsByDate[date];
                const percentage = (count / maxBookings) * 100;

                const row = document.createElement("div");
                row.className = "chart-row";

                const label = document.createElement("span");
                label.className = "chart-label";
                label.textContent = date;

                const track = document.createElement("div");
                track.className = "chart-track";

                const fill = document.createElement("div");
                fill.className = "chart-fill confirmed";
                fill.style.width = `${percentage}%`;

                track.appendChild(fill);

                const value = document.createElement("span");
                value.className = "chart-value";
                value.textContent = count;

                row.append(label, track, value);
                trendsContainer.appendChild(row);
            });
        }



        // Find the room with the highest number of bookings
        const roomBookingCounts = rooms.map(room => {
            const count = bookings.filter(
                booking => booking.room_id === room.room_id
            ).length;

            return {
                roomId: room.room_id,
                count: count
            };
        });

        const mostBooked = roomBookingCounts.reduce(
            (highest, current) =>
                current.count > highest.count ? current : highest,
            { roomId: null, count: 0 }
        );

        const mostBookedRoomEl = document.getElementById("mostBookedRoom");
        const mostBookedCountEl = document.getElementById("mostBookedRoomCount");

        if (mostBooked.count === 0) {
            mostBookedRoomEl.textContent = "No bookings yet";
            mostBookedCountEl.textContent = "Total bookings: 0";
        } else {
            mostBookedRoomEl.textContent = mostBooked.roomId;
            mostBookedCountEl.textContent =
                `Total bookings: ${mostBooked.count}`;
        }


        const confirmed = bookings.filter(
            booking => booking.status === "confirmed"
        ).length;

        const pending = bookings.filter(
            booking => booking.status === "pending"
        ).length;

        const rejected = bookings.filter(
            booking => booking.status === "rejected"
        ).length;

        totalBookingsEl.textContent = total;
        confirmedEl.textContent = confirmed;
        pendingEl.textContent = pending;
        rejectedEl.textContent = rejected;

        // Display booking summary
        summaryEl.textContent =
            `Total: ${total} | Confirmed: ${confirmed} | ` +
            `Pending: ${pending} | Rejected: ${rejected}`;


        const chartContainer = document.getElementById("bookingStatusChart");

        const statuses = [
            { name: "Confirmed", count: confirmed, className: "confirmed" },
            { name: "Pending", count: pending, className: "pending" },
            { name: "Rejected", count: rejected, className: "rejected" }
        ];

        chartContainer.replaceChildren();

        statuses.forEach(status => {
            const percentage = total > 0
                ? (status.count / total) * 100
                : 0;

            const row = document.createElement("div");
            row.className = "chart-row";

            const label = document.createElement("span");
            label.className = "chart-label";
            label.textContent = status.name;

            const track = document.createElement("div");
            track.className = "chart-track";

            const fill = document.createElement("div");
            fill.className = `chart-fill ${status.className}`;
            fill.style.width = `${percentage}%`;

            track.appendChild(fill);

            const value = document.createElement("span");
            value.className = "chart-value";
            value.textContent = `${status.count}`;

            row.append(label, track, value);
            chartContainer.appendChild(row);
        });


        // Calculate bookings for each room
        roomTable.replaceChildren();

        if (rooms.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 4;
            cell.textContent = "No rooms found.";
            row.appendChild(cell);
            roomTable.appendChild(row);
            return;
        }

        rooms.forEach(room => {
            const roomBookings = bookings.filter(
                booking => booking.room_id === room.room_id
            );

            const roomConfirmed = roomBookings.filter(
                booking => booking.status === "confirmed"
            ).length;

            const roomPending = roomBookings.filter(
                booking => booking.status === "pending"
            ).length;

            const row = document.createElement("tr");

            [
                room.room_id,
                roomBookings.length,
                roomConfirmed,
                roomPending
            ].forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = String(value ?? "");
                row.appendChild(cell);
            });

            roomTable.appendChild(row);
        });

    } catch (error) {
        console.error("Analytics loading error:", error);

        summaryEl.textContent = "Unable to load analytics. Check the console.";
        roomTable.innerHTML = `
            <tr>
                <td colspan="4">Failed to load room statistics.</td>
            </tr>
        `;
    }
}



async function loadSettings() {
    try {
        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError) throw authError;

        if (!user) {
            throw new Error("No authenticated user found.");
        }

        const { data: profile, error: profileError } =
            await supabaseClient
                .from("users")
                .select("username, email, role")
                .eq("user_id", user.id)
                .single();

        if (profileError) throw profileError;

        document.getElementById("settingsUsername").textContent =
            profile.username || "Not available";

        document.getElementById("settingsEmail").textContent =
            profile.email || user.email || "Not available";

        document.getElementById("settingsRole").textContent =
            profile.role || "Not available";

    } catch (error) {
        console.error("Settings loading error:", error);
        alert("Unable to load account settings.");
    }

    
    const changePasswordBtn =
        document.getElementById("changePasswordBtn");

    if (!changePasswordBtn.dataset.modalBound) {

        changePasswordBtn.addEventListener("click", openPasswordModal);

        document.getElementById("closePasswordModal")
            .addEventListener("click", closePasswordModal);

        document.getElementById("cancelPasswordBtn")
            .addEventListener("click", closePasswordModal);

        document.getElementById("passwordModalBackdrop")
            .addEventListener("click", closePasswordModal);

        document.getElementById("changePasswordForm")
            .addEventListener("submit", handlePasswordChange);

        changePasswordBtn.dataset.modalBound = "true";
    }


    const logoutButton = document.getElementById("settingsLogoutBtn");

    if (!logoutButton.dataset.handlerBound) {
        logoutButton.addEventListener("click", logoutUser);
        logoutButton.dataset.handlerBound = "true";
    }

}



async function logoutUser() {
    const confirmLogout = confirm("Are you sure you want to logout?");

    if (!confirmLogout) return;

    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        alert("Logged out successfully!");

        window.location.reload();

    } catch (error) {
        console.error("Logout error:", error);
        alert("Unable to logout: " + error.message);
    }
}



// =====================================
// CHANGE PASSWORD MODAL
// =====================================

function openPasswordModal() {
    const modal = document.getElementById("passwordModal");

    document.getElementById("changePasswordForm").reset();
    document.getElementById("passwordMessage").textContent = "";

    modal.hidden = false;

    document.getElementById("currentPassword").focus();
}

function closePasswordModal() {
    const modal = document.getElementById("passwordModal");

    modal.hidden = true;

    document.getElementById("changePasswordForm").reset();
    document.getElementById("passwordMessage").textContent = "";
}

async function handlePasswordChange(event) {
    event.preventDefault();

    const currentPassword =
        document.getElementById("currentPassword").value;

    const newPassword =
        document.getElementById("newPassword").value;

    const confirmPassword =
        document.getElementById("confirmNewPassword").value;

    const message =
        document.getElementById("passwordMessage");

    const saveButton =
        document.getElementById("savePasswordBtn");

    message.style.color = "#f87171";
    message.textContent = "";

    if (!currentPassword || !newPassword || !confirmPassword) {
        message.textContent = "Please fill in all password fields.";
        return;
    }

    if (newPassword.length < 8) {
        message.textContent =
            "New password must contain at least 8 characters.";
        return;
    }

    if (newPassword !== confirmPassword) {
        message.textContent = "New passwords do not match.";
        return;
    }

    if (currentPassword === newPassword) {
        message.textContent =
            "New password must be different from your current password.";
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "Verifying...";

        // Get the currently logged-in user
        const { data: { user }, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError) throw userError;

        if (!user || !user.email) {
            throw new Error("Unable to identify your account.");
        }

        // Verify the old password
        const { error: verifyError } =
            await supabaseClient.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

        if (verifyError) {
            message.textContent = "Current password is incorrect.";
            return;
        }

        // Update the password
        saveButton.textContent = "Updating...";

        const { error: updateError } =
            await supabaseClient.auth.updateUser({
                password: newPassword
            });

        if (updateError) throw updateError;

        message.style.color = "#22c55e";
        message.textContent = "Password changed successfully!";

        setTimeout(() => {
            closePasswordModal();
        }, 1500);

    } catch (error) {
        console.error("Password change error:", error);

        message.textContent =
            error.message || "Unable to change password.";

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Update Password";
    }
}



// ===============================
// NOTIFICATION PANEL
// ===============================

const notificationButton = document.getElementById("notificationButton");
const notificationPanel = document.getElementById("notificationPanel");
const closeNotifications = document.getElementById("closeNotifications");


if (closeNotifications && notificationPanel) {

    closeNotifications.addEventListener("click", () => {
        notificationPanel.hidden = true;

        if (notificationButton) {
            notificationButton.setAttribute("aria-expanded", "false");
        }
    });
}




async function loadNotifications() {

    const notificationList =
        document.getElementById("notificationList");

    const notificationCount =
        document.getElementById("notificationCount");

    if (!notificationList || !notificationCount) return;

    notificationList.textContent = "Loading notifications...";

    try {

        // Get logged-in user
        const { data: authData, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError) throw authError;

        const userId = authData.user?.id;

        if (!userId) {
            notificationList.textContent =
                "Please log in to view notifications.";

            notificationCount.hidden = true;
            return;
        }

        // Fetch notifications
        const { data, error } = await supabaseClient
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const notifications = data || [];

        // Update unread count
        const unreadCount = notifications.filter(
            item => !item.is_read
        ).length;

        notificationCount.textContent = unreadCount;
        notificationCount.hidden = unreadCount === 0;

        notificationList.replaceChildren();

        if (notifications.length === 0) {
            notificationList.innerHTML =
                "<p class='notification-empty'>No notifications yet.</p>";
            return;
        }

        // Display clickable notifications
        notifications.forEach(item => {

            const notification = document.createElement("button");

            notification.type = "button";
            notification.className = "notification-item";

            if (!item.is_read) {
                notification.classList.add("unread");
            }

            const title = document.createElement("strong");
            title.textContent = item.title;

            const message = document.createElement("p");
            message.textContent = item.message;

            const time = document.createElement("small");
            time.textContent =
                new Date(item.created_at).toLocaleString();

            notification.append(title, message, time);

            // CLICK NOTIFICATION
            notification.addEventListener("click", async () => {

                // Mark as read first
                if (!item.is_read) {
                    await markNotificationRead(item.notification_id);
                }

                // Close notification dropdown
                const panel =
                    document.getElementById("notificationPanel");

                const button =
                    document.getElementById("notificationButton");

                if (panel) panel.hidden = true;

                if (button) {
                    button.setAttribute("aria-expanded", "false");
                }

                // Navigate to Bookings page
                const bookingsLink = document.querySelector(
                    '.nav-link[href="#bookings"]'
                );

                if (bookingsLink) {
                    bookingsLink.click();
                }

            });

            notificationList.appendChild(notification);

        });

    } catch (error) {

        console.error("Notification error:", error);

        notificationList.textContent =
            "Unable to load notifications.";

    }
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}



function initializePasswordVisibility() {
    document.querySelectorAll(".toggle-password").forEach(button => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.target);

            if (!input) return;

            const showPassword = input.type === "password";

            input.type = showPassword ? "text" : "password";
            button.textContent = showPassword ? "🙈" : "👁";

            button.setAttribute(
                "aria-label",
                showPassword ? "Hide password" : "Show password"
            );
        });
    });
}