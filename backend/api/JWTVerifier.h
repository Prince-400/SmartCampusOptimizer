
#ifndef JWT_VERIFIER_H
#define JWT_VERIFIER_H

#include "SupabaseClient.h"

#include <string>
#include <nlohmann/json.hpp>

class JWTVerifier {
public:
    struct VerificationResult {
        bool valid = false;
        std::string userId;
        std::string error;
        nlohmann::json claims;
    };

    JWTVerifier(
        SupabaseClient& client,
        const std::string& projectUrl
    );

    VerificationResult verify(
        const std::string& accessToken
    );

private:
    SupabaseClient& client;
    std::string projectUrl;

    bool validateClaims(
        const nlohmann::json& claims,
        std::string& error
    );
};

#endif
