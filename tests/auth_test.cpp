
#include "../backend/api/AuthManager.h"
#include "../backend/config/Config.h"

#include <iostream>
#include <string>

int main() {
    if (!Config::load("backend/config/.env")) {
        std::cerr << "Configuration loading failed.\n";
        return 1;
    }

    SupabaseClient client(
        Config::getSupabaseUrl(),
        Config::getSupabasePublishableKey()
    );

    AuthManager auth(client);

    std::string email;
    std::string password;

    std::cout << "===== Smart Campus Login Test =====\n";

    std::cout << "Email: ";
    std::getline(std::cin, email);

    std::cout << "Password: ";
    std::getline(std::cin, password);

    if (auth.signIn(email, password)) {
        std::cout << "\nLogin successful!\n";
        std::cout << "User ID: " << auth.getUserId() << '\n';
        std::cout << "Email: " << auth.getEmail() << '\n';
        std::cout << "Authenticated: "
                  << (auth.isAuthenticated() ? "Yes" : "No")
                  << '\n';

        auth.signOut();

        std::cout << "\nLogged out successfully.\n";
    }
    else {
        std::cout << "\nLogin failed. Check credentials or account status.\n";
        return 1;
    }

    return 0;
}
