
#include "SupabaseClient.h"
#include <cctype>
#include <curl/curl.h>

#include <memory>
#include <stdexcept>
#include <algorithm>

namespace {

    // Receives HTTP response data from libcurl.
    size_t writeCallback(
        char* data,
        size_t size,
        size_t count,
        void* userData
    ) {
        size_t totalSize = size * count;

        auto* responseBody =
            static_cast<std::string*>(userData);

        responseBody->append(data, totalSize);

        return totalSize;
    }

    // Automatically releases CURL resources.
    struct CurlDeleter {
        void operator()(CURL* curl) const {
            if (curl) {
                curl_easy_cleanup(curl);
            }
        }
    };

    struct HeaderDeleter {
        void operator()(curl_slist* headers) const {
            if (headers) {
                curl_slist_free_all(headers);
            }
        }
    };

}

SupabaseClient::SupabaseClient(
    const std::string& projectUrl,
    const std::string& publishableKey
)
    : projectUrl(projectUrl),
      publishableKey(publishableKey) {

    if (this->projectUrl.empty() ||
        this->publishableKey.empty()) {
        throw std::invalid_argument(
            "Supabase URL and Publishable Key are required."
        );
    }

    // Remove trailing slashes from project URL.
    while (!this->projectUrl.empty() &&
           this->projectUrl.back() == '/') {
        this->projectUrl.pop_back();
    }

    if (this->projectUrl.rfind("https://", 0) != 0) {
        throw std::invalid_argument(
            "Supabase URL must use HTTPS."
        );
    }

    static const bool curlInitialized = []() {
        return curl_global_init(CURL_GLOBAL_DEFAULT) == CURLE_OK;
    }();

    if (!curlInitialized) {
        throw std::runtime_error(
            "Failed to initialize libcurl."
        );
    }
}

SupabaseClient::Response SupabaseClient::request(
    const std::string& method,
    const std::string& endpoint,
    const nlohmann::json& payload,
    const std::string& accessToken
) {
    Response response;

    // Accept only API paths, not arbitrary URLs.
    if (endpoint.empty() || endpoint.front() != '/' ||
        endpoint.find("://") != std::string::npos) {
        response.error = "Invalid API endpoint.";
        return response;
    }

    std::string upperMethod = method;

    std::transform(
        upperMethod.begin(),
        upperMethod.end(),
        upperMethod.begin(),
        [](unsigned char c) {
            return static_cast<char>(std::toupper(c));
        }
    );

    if (upperMethod != "GET" &&
        upperMethod != "POST" &&
        upperMethod != "PATCH" &&
        upperMethod != "DELETE") {
        response.error = "Unsupported HTTP method.";
        return response;
    }

    std::unique_ptr<CURL, CurlDeleter> curl(
        curl_easy_init()
    );

    if (!curl) {
        response.error = "Failed to create CURL handle.";
        return response;
    }

    std::string url = projectUrl + endpoint;

    std::unique_ptr<curl_slist, HeaderDeleter> headers;

    curl_slist* rawHeaders = nullptr;

    auto addHeader = [&](const std::string& header) {
        curl_slist* updated =
            curl_slist_append(rawHeaders, header.c_str());

        if (!updated) {
            throw std::runtime_error(
                "Failed to allocate HTTP headers."
            );
        }

        rawHeaders = updated;
    };

    try {
        addHeader("apikey: " + publishableKey);
        addHeader("Accept: application/json");

        if (upperMethod == "POST" ||
            upperMethod == "PATCH") {
            addHeader("Content-Type: application/json");
        }

        // Forward the authenticated user's JWT when available.
        if (!accessToken.empty()) {
            addHeader("Authorization: Bearer " + accessToken);
        }

        headers.reset(rawHeaders);
        rawHeaders = nullptr;

        curl_easy_setopt(curl.get(), CURLOPT_URL, url.c_str());

        curl_easy_setopt(
            curl.get(),
            CURLOPT_HTTPHEADER,
            headers.get()
        );

        curl_easy_setopt(
            curl.get(),
            CURLOPT_WRITEFUNCTION,
            writeCallback
        );

        curl_easy_setopt(
            curl.get(),
            CURLOPT_WRITEDATA,
            &response.body
        );

        // Keep HTTPS certificate and hostname verification enabled.
        curl_easy_setopt(curl.get(), CURLOPT_SSL_VERIFYPEER, 1L);
        curl_easy_setopt(curl.get(), CURLOPT_SSL_VERIFYHOST, 2L);
        curl_easy_setopt(
            curl.get(),
            CURLOPT_CAINFO,
            R"(D:\DSA Project\SmartCampusOptimizer\certificates\cacert.pem)"
        );

        curl_easy_setopt(curl.get(), CURLOPT_CONNECTTIMEOUT, 10L);
        curl_easy_setopt(curl.get(), CURLOPT_TIMEOUT, 30L);

        // Do not follow redirects to other locations.
        curl_easy_setopt(curl.get(), CURLOPT_FOLLOWLOCATION, 0L);

        std::string requestBody;

        if (upperMethod == "POST" ||
            upperMethod == "PATCH") {

            requestBody = payload.dump();

            curl_easy_setopt(
                curl.get(),
                CURLOPT_POSTFIELDS,
                requestBody.c_str()
            );

            curl_easy_setopt(
                curl.get(),
                CURLOPT_POSTFIELDSIZE,
                static_cast<long>(requestBody.size())
            );
        }

        if (upperMethod == "POST") {
            curl_easy_setopt(curl.get(), CURLOPT_POST, 1L);
        }
        else if (upperMethod != "GET") {
            curl_easy_setopt(
                curl.get(),
                CURLOPT_CUSTOMREQUEST,
                upperMethod.c_str()
            );
        }

        CURLcode result = curl_easy_perform(curl.get());

        if (result != CURLE_OK) {
            response.error = curl_easy_strerror(result);
            return response;
        }

        curl_easy_getinfo(
            curl.get(),
            CURLINFO_RESPONSE_CODE,
            &response.statusCode
        );
    }
    catch (const std::exception& exception) {
        if (rawHeaders) {
            curl_slist_free_all(rawHeaders);
        }

        response.error = exception.what();
    }

    return response;
}
