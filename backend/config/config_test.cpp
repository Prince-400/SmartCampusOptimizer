

#include "Config.h"

#include <iostream>

int main() {
    if (!Config::load("backend/config/.env")) {
        std::cerr << "Configuration loading failed.\n";
        return 1;
    }

    if (Config::getSupabaseUrl().empty() ||
        Config::getSupabasePublishableKey().empty()) {
        std::cerr << "Required configuration is missing.\n";
        return 1;
    }

    std::cout << "Configuration loaded successfully!\n";
    std::cout << "Supabase URL: configured\n";
    std::cout << "Publishable key: configured\n";

    return 0;
}
