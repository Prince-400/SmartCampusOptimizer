
#include "RoomDatabase.h"
#include <iostream>

using json = nlohmann::json;

RoomDatabase::RoomDatabase(SupabaseClient& supabaseClient)
    : client(supabaseClient) {}

// Add a new room
bool RoomDatabase::addRoom(
    const json& roomData,
    const std::string& accessToken
) {
    SupabaseClient::Response response = client.request(
        "POST",
        "/rest/v1/rooms",
        roomData,
        accessToken
    );

    if (!response.isSuccess()) {
        std::cerr << "Failed to add room: "
                  << response.error << "\n"
                  << response.body << std::endl;
        return false;
    }

    std::cout << "Room added successfully!\n";
    return true;
}

// Retrieve all rooms
json RoomDatabase::getAllRooms(
    const std::string& accessToken
) {
    SupabaseClient::Response response = client.request(
        "GET",
        "/rest/v1/rooms?select=*",
        nullptr,
        accessToken
    );

    if (!response.isSuccess()) {
        std::cerr << "Failed to retrieve rooms: "
                  << response.error << "\n"
                  << response.body << std::endl;
        return json::array();
    }

    try {
        return json::parse(response.body);
    }
    catch (const json::exception& e) {
        std::cerr << "Invalid rooms response: "
                  << e.what() << std::endl;
        return json::array();
    }
}

// Update a room
bool RoomDatabase::updateRoom(
    const std::string& roomId,
    const json& updatedData,
    const std::string& accessToken
) {
    // Encode the room ID as a URL query value.
    std::string endpoint =
        "/rest/v1/rooms?room_id=eq." + roomId;

    SupabaseClient::Response response = client.request(
        "PATCH",
        endpoint,
        updatedData,
        accessToken
    );

    if (!response.isSuccess()) {
        std::cerr << "Failed to update room: "
                  << response.error << "\n"
                  << response.body << std::endl;
        return false;
    }

    std::cout << "Room updated successfully!\n";
    return true;
}

// Delete a room
bool RoomDatabase::deleteRoom(
    const std::string& roomId,
    const std::string& accessToken
) {
    std::string endpoint =
        "/rest/v1/rooms?room_id=eq." + roomId;

    SupabaseClient::Response response = client.request(
        "DELETE",
        endpoint,
        nullptr,
        accessToken
    );

    if (!response.isSuccess()) {
        std::cerr << "Failed to delete room: "
                  << response.error << "\n"
                  << response.body << std::endl;
        return false;
    }

    std::cout << "Room deleted successfully!\n";
    return true;
}
