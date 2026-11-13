
#include "../backend/api/JWTVerifier.h"
#include "../backend/config/Config.h"

#include <iostream>
#include <string>

int main() {
    std::cout << "===== Smart Campus JWT Test =====\n";

    if (!Config::load("backend/config/.env")) {
        std::cerr << "Configuration loading failed.\n";
        return 1;
    }

    SupabaseClient client(
        Config::getSupabaseUrl(),
        Config::getSupabasePublishableKey()
    );

    JWTVerifier verifier(
        client,
        Config::getSupabaseUrl()
    );

    std::string token;

    std::cout << "Paste an ES256 access token:\n";
    std::getline(std::cin, token);

    auto result = verifier.verify(token);

    if (result.valid) {
        std::cout << "\nJWT verification successful!\n";
        std::cout << "Verified User ID: "
                  << result.userId << '\n';
    }
    else {
        std::cout << "\nJWT verification failed.\n";
        std::cout << "Reason: " << result.error << '\n';
    }

    return result.valid ? 0 : 1;
}
