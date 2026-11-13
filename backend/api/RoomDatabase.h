
#ifndef ROOM_DATABASE_H
#define ROOM_DATABASE_H

#include "SupabaseClient.h"
#include <string>
#include <vector>
#include <nlohmann/json.hpp>

class RoomDatabase {
private:
    SupabaseClient& client;

public:
    explicit RoomDatabase(SupabaseClient& supabaseClient);

    bool addRoom(
        const nlohmann::json& roomData,
        const std::string& accessToken
    );

    nlohmann::json getAllRooms(
        const std::string& accessToken
    );

    bool updateRoom(
        const std::string& roomId,
        const nlohmann::json& updatedData,
        const std::string& accessToken
    );

    bool deleteRoom(
        const std::string& roomId,
        const std::string& accessToken
    );
};

#endif

