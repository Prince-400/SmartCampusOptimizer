
#include "../backend/api/BookingDatabase.h"
#include "../backend/api/AuthManager.h"
#include "../backend/config/Config.h"

#include <iostream>
#include <string>

int main() {
    std::cout << "\n===== BOOKING DATABASE TEST =====\n";

    if (!Config::load("backend/config/.env")) {
        std::cerr << "Failed to load configuration.\n";
        return 1;
    }

    SupabaseClient client(
        Config::getSupabaseUrl(),
        Config::getSupabasePublishableKey()
    );

    AuthManager auth(client);

    std::string email;
    std::string password;

    std::cout << "Enter admin email: ";
    std::getline(std::cin, email);

    std::cout << "Enter admin password: ";
    std::getline(std::cin, password);

    if (!auth.signIn(email, password)) {
        std::cerr << "Login failed.\n";
        return 1;
    }

    std::cout << "Authenticated User ID: "
          << auth.getUserId() << std::endl;

    BookingDatabase bookingDatabase(client);
    // Prepare a test booking
    nlohmann::json newBooking = {
        {"booking_id", "BOOK-001"},
        {"room_id", "ROOM-001"},
        {"booked_by", auth.getUserId()},
        {"purpose", "Project demonstration"},
        {"start_at", "2026-12-01T10:00:00+05:30"},
        {"end_at", "2026-12-01T11:00:00+05:30"},
        {"status", "pending"}
    };

    // Insert booking
    std::cout << "\nInserting test booking...\n";

    bool inserted = bookingDatabase.addBooking(
        newBooking,
        auth.getAccessToken()
    );

    if (!inserted) {
        std::cerr << "Booking insertion failed.\n";
        auth.signOut();
        return 1;
    }


    // Retrieve bookings
    auto bookings = bookingDatabase.getAllBookings(
        auth.getAccessToken()
    );

    std::cout << "\n===== BOOKINGS FROM SUPABASE =====\n";

    if (bookings.empty()) {
        std::cout << "No bookings found.\n";
    }
    else {
        for (const auto& booking : bookings) {
            std::cout << "\nBooking ID: "
                      << booking.value("booking_id", "N/A");

            std::cout << "\nRoom ID: "
                      << booking.value("room_id", "N/A");

            std::cout << "\nBooked By: "
                      << booking.value("booked_by", "N/A");

            std::cout << "\nPurpose: "
                      << booking.value("purpose", "N/A");

            std::cout << "\nStart: "
                      << booking.value("start_at", "N/A");

            std::cout << "\nEnd: "
                      << booking.value("end_at", "N/A");

            std::cout << "\nStatus: "
                      << booking.value("status", "N/A");

            std::cout << "\n-------------------------\n";
        }
    }

    // Retrieve bookings for the logged-in user
    auto myBookings = bookingDatabase.getMyBookings(
        auth.getUserId(),
        auth.getAccessToken()
    );

    std::cout << "\nYour bookings: "
              << myBookings.size() << std::endl;

    auth.signOut();

    std::cout << "\nBooking database test finished.\n";

    return 0;
}
