
#include "../backend/api/RoomDatabase.h"
#include "../backend/api/AuthManager.h"
#include "../backend/config/Config.h"

#include <iostream>
#include <string>

int main() {
    std::cout << "\n===== ROOM DATABASE TEST =====\n";

    // Load Supabase configuration
    if (!Config::load("backend/config/.env")) {
        std::cerr << "Failed to load configuration.\n";
        return 1;
    }

    // Initialize Supabase
    SupabaseClient client(
        Config::getSupabaseUrl(),
        Config::getSupabasePublishableKey()
    );

    // Authenticate user
    AuthManager auth(client);

    std::string email;
    std::string password;

    std::cout << "Enter admin email: ";
    std::getline(std::cin, email);

    std::cout << "Enter admin password: ";
    std::getline(std::cin, password);

    if (!auth.signIn(email, password)) {
        std::cerr << "\nLogin failed.\n";
        return 1;
    }

    std::cout << "\nLogin successful!\n";

    
    // Initialize RoomDatabase
    RoomDatabase roomDatabase(client);

    // Prepare sample room
    nlohmann::json newRoom = {
        {"room_id", "ROOM-001"},
        {"room_name", "Computer Lab 1"},
        {"room_type", "Laboratory"},
        {"capacity", 40},
        {"has_projector", true},
        {"has_computers", true},
        {"is_active", true}
    };

    // Insert sample room into Supabase
    std::cout << "\nInserting sample room...\n";

    bool inserted = roomDatabase.addRoom(
        newRoom,
        auth.getAccessToken()
    );

    if (!inserted) {
        std::cerr << "Room insertion failed.\n";
        auth.signOut();
        return 1;
    }

    // Retrieve rooms from Supabase
    auto rooms = roomDatabase.getAllRooms(
        auth.getAccessToken()
    );


    std::cout << "\n===== ROOMS FROM SUPABASE =====\n";

    if (rooms.empty()) {
        std::cout << "No rooms found, or the request failed.\n";
    }
    else {
        for (const auto& room : rooms) {
            std::cout << "\nRoom ID: "
                      << room.value("room_id", "N/A");

            std::cout << "\nRoom Name: "
                      << room.value("room_name", "N/A");

            std::cout << "\nRoom Type: "
                      << room.value("room_type", "N/A");

            std::cout << "\nCapacity: "
                      << room.value("capacity", 0);

            std::cout << "\nProjector: "
                      << (room.value("has_projector", false)
                          ? "Yes" : "No");

            std::cout << "\nComputers: "
                      << (room.value("has_computers", false)
                          ? "Yes" : "No");

            std::cout << "\nActive: "
                      << (room.value("is_active", false)
                          ? "Yes" : "No");

            std::cout << "\n-------------------------\n";
        }
    }

    auth.signOut();

    std::cout << "\nRoom database test finished.\n";

    return 0;
}
