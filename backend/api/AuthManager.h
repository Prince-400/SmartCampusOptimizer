
#ifndef AUTH_MANAGER_H
#define AUTH_MANAGER_H

#include "SupabaseClient.h"

#include <string>
#include <chrono>
#include <nlohmann/json.hpp>

class AuthManager {
public:
    explicit AuthManager(SupabaseClient& client);

    bool signIn(
        const std::string& email,
        const std::string& password
    );

    bool refreshSession();

    void signOut();

    bool isAuthenticated() const;

    const std::string& getAccessToken() const;
    const std::string& getRefreshToken() const;
    const std::string& getUserId() const;
    const std::string& getEmail() const;

private:
    SupabaseClient& client;

    std::string accessToken;
    std::string refreshToken;
    std::string userId;
    std::string email;

    std::chrono::system_clock::time_point tokenExpiry;

    bool updateSession(const nlohmann::json& response);
};

#endif
