
#ifndef SUPABASE_CLIENT_H
#define SUPABASE_CLIENT_H

#include <string>
#include <nlohmann/json.hpp>

class SupabaseClient {
public:
    struct Response {
        long statusCode = 0;
        std::string body;
        std::string error;

        bool isSuccess() const {
            return statusCode >= 200 && statusCode < 300;
        }
    };

    SupabaseClient(
        const std::string& projectUrl,
        const std::string& publishableKey
    );

    Response request(
        const std::string& method,
        const std::string& endpoint,
        const nlohmann::json& payload = nullptr,
        const std::string& accessToken = ""
    );

private:
    std::string projectUrl;
    std::string publishableKey;
};

#endif
