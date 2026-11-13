
#include "AuthManager.h"

#include <stdexcept>
#include <utility>

AuthManager::AuthManager(SupabaseClient& client)
    : client(client) {
}

bool AuthManager::updateSession(
    const nlohmann::json& response
) {
    try {
        if (!response.contains("access_token") ||
            !response.contains("refresh_token") ||
            !response.contains("expires_in") ||
            !response.contains("user")) {
            return false;
        }

        const auto& user = response.at("user");

        if (!user.contains("id") ||
            !user.contains("email")) {
            return false;
        }

        std::string newAccessToken =
            response.at("access_token").get<std::string>();

        std::string newRefreshToken =
            response.at("refresh_token").get<std::string>();

        std::string newUserId =
            user.at("id").get<std::string>();

        std::string newEmail =
            user.at("email").get<std::string>();

        long long expiresIn =
            response.at("expires_in").get<long long>();

        if (newAccessToken.empty() ||
            newRefreshToken.empty() ||
            newUserId.empty() ||
            expiresIn <= 0) {
            return false;
        }

        accessToken = std::move(newAccessToken);
        refreshToken = std::move(newRefreshToken);
        userId = std::move(newUserId);
        email = std::move(newEmail);

        tokenExpiry =
            std::chrono::system_clock::now() +
            std::chrono::seconds(expiresIn);

        return true;
    }
    catch (const nlohmann::json::exception&) {
        return false;
    }
}

bool AuthManager::signIn(
    const std::string& email,
    const std::string& password
) {
    if (email.empty() || password.empty()) {
        return false;
    }

    nlohmann::json payload = {
        {"email", email},
        {"password", password}
    };

    auto response = client.request(
        "POST",
        "/auth/v1/token?grant_type=password",
        payload
    );

    if (!response.isSuccess()) {
        return false;
    }

    try {
        auto jsonResponse =
            nlohmann::json::parse(response.body);

        return updateSession(jsonResponse);
    }
    catch (const nlohmann::json::exception&) {
        return false;
    }
}

bool AuthManager::refreshSession() {
    if (refreshToken.empty()) {
        return false;
    }

    nlohmann::json payload = {
        {"refresh_token", refreshToken}
    };

    auto response = client.request(
        "POST",
        "/auth/v1/token?grant_type=refresh_token",
        payload
    );

    if (!response.isSuccess()) {
        signOut();
        return false;
    }

    try {
        auto jsonResponse =
            nlohmann::json::parse(response.body);

        if (!updateSession(jsonResponse)) {
            signOut();
            return false;
        }

        return true;
    }
    catch (const nlohmann::json::exception&) {
        signOut();
        return false;
    }
}

void AuthManager::signOut() {
    if (!accessToken.empty()) {
        client.request(
            "POST",
            "/auth/v1/logout",
            nullptr,
            accessToken
        );
    }

    accessToken.clear();
    refreshToken.clear();
    userId.clear();
    email.clear();

    tokenExpiry =
        std::chrono::system_clock::time_point{};
}

bool AuthManager::isAuthenticated() const {
    return !accessToken.empty() &&
        std::chrono::system_clock::now() < tokenExpiry;
}

const std::string& AuthManager::getAccessToken() const {
    return accessToken;
}

const std::string& AuthManager::getRefreshToken() const {
    return refreshToken;
}

const std::string& AuthManager::getUserId() const {
    return userId;
}

const std::string& AuthManager::getEmail() const {
    return email;
}
