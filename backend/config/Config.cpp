
#include "Config.h"

#include <fstream>
#include <stdexcept>
#include <algorithm>
#include <cctype>

std::string Config::supabaseUrl;
std::string Config::supabasePublishableKey;

namespace {

std::string trim(const std::string& value) {
    const std::string whitespace = " \t\r\n";

    size_t start = value.find_first_not_of(whitespace);

    if (start == std::string::npos) {
        return "";
    }

    size_t end = value.find_last_not_of(whitespace);

    return value.substr(start, end - start + 1);
}

}

bool Config::load(const std::string& filePath) {
    std::ifstream file(filePath);

    if (!file.is_open()) {
        return false;
    }

    std::string line;

    while (std::getline(file, line)) {
        line = trim(line);

        if (line.empty() || line[0] == '#') {
            continue;
        }

        size_t separator = line.find('=');

        if (separator == std::string::npos) {
            continue;
        }

        std::string key = trim(line.substr(0, separator));
        std::string value = trim(line.substr(separator + 1));

        if (key == "SUPABASE_URL") {
            supabaseUrl = value;
        }
        else if (key == "SUPABASE_PUBLISHABLE_KEY") {
            supabasePublishableKey = value;
        }
    }

    if (supabaseUrl.empty() ||
        supabasePublishableKey.empty()) {
        return false;
    }

    if (supabaseUrl.rfind("https://", 0) != 0) {
        return false;
    }

    return true;
}

const std::string& Config::getSupabaseUrl() {
    return supabaseUrl;
}

const std::string& Config::getSupabasePublishableKey() {
    return supabasePublishableKey;
}
