
#include "SupabaseClient.h"
#include "../config/Config.h"

#include <iostream>

int main() {
    if (!Config::load("backend/config/.env")) {
        std::cerr << "Configuration loading failed.\n";
        return 1;
    }

    try {
        SupabaseClient client(
            Config::getSupabaseUrl(),
            Config::getSupabasePublishableKey()
        );

        auto response = client.request(
            "GET",
            "/rest/v1/rooms?select=room_id"
        );

        std::cout << "HTTP Status: "
                  << response.statusCode << '\n';

        if (!response.error.empty()) {
            std::cerr << "Request error: "
                      << response.error << '\n';
            return 1;
        }

        if (response.isSuccess()) {
            std::cout << "Supabase API connection successful!\n";
        } else {
            std::cerr << "Supabase API returned an error.\n";
            return 1;
        }
    }
    catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << '\n';
        return 1;
    }

    return 0;
}
